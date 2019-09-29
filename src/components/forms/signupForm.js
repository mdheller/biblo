import Checkbox from '@material-ui/core/Checkbox';
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormHelperText from '@material-ui/core/FormHelperText';
import Input from '@material-ui/core/Input';
import InputLabel from '@material-ui/core/InputLabel';
import React from 'react';
import { Link, Redirect } from 'react-router-dom';
import isEmail from 'validator/lib/isEmail';
import { auth, userRef } from '../../config/firebase';
import { app, handleFirestoreError } from '../../config/shared';
import { funcType } from '../../config/types';
import SocialAuth from '../socialAuth';

export default class SignupForm extends React.Component {
	state = {
    checkedTerms: false, 
    data: {
      uid: '',
      displayName: '',
      email: '',
      password: '',
      roles: {
        admin: false,
        editor: true,
        premium: false
      },
      stats: {
        ratings_num: 0,
        reviews_num: 0,
        shelf_num: 0,
        wishlist_num: 0
      }
    },
    loading: false,
    errors: {},
    authError: '',
    redirectTo: null
  };

  static propTypes = {
    openSnackbar: funcType.isRequired
  }

  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  toggleCheckbox = name => event => this.setState({ [name]: event.target.checked });

	onChange = e => {
    if (this._isMounted) {
      this.setState({ 
        data: { ...this.state.data, [e.target.name]: e.target.value }, 
        errors: { ...this.state.errors, [e.target.name]: null }
      });
    }
	};

	onSubmit = e => {
    e.preventDefault();
    const { data } = this.state;
    const { openSnackbar } = this.props;
    const errors = this.validate(data);
    
    if (this._isMounted) this.setState({ authError: '', loading: true, errors });
    
		if (Object.keys(errors).length === 0) {
      auth.createUserWithEmailAndPassword(data.email, data.password).then(user => {
        if (!user) console.warn('No user is signed in');
      }).catch(err => {
        if (this._isMounted) {
          this.setState({
            authError: handleFirestoreError(err),
            loading: false
          });
        }
      });

      auth.onAuthStateChanged(user => {
        if (user) {
          const timestamp = Number((new Date(user.metadata.creationTime)).getTime());
          userRef(user.uid).set({
            creationTime: timestamp,
            displayName: data.displayName,
            email: user.email,
            photoURL: '',
            roles: data.roles,
            stats: data.stats,
            termsAgreement: timestamp, 
            privacyAgreement: timestamp,
            uid: user.uid,
          }).then().catch(err => openSnackbar(handleFirestoreError(err), 'error'));
        }
      });

      auth.onIdTokenChanged(user => {
        if (user) {
          if (user.emailVerified === false) {
            const actionCodeSettings = {
              url: `${app.url}/login/?email=${auth.currentUser.email}`
            };
            user.sendEmailVerification(actionCodeSettings).then(() => {
              if (this._isMounted) this.setState({ redirectTo: '/verify-email' });
            }).catch(err => openSnackbar(handleFirestoreError(err), 'error'));
          }
        }
      });
		}
	};

	validate = data => {
    const errors = {};
    if (!this.state.checkedTerms) {
      errors.checkedTerms = "Spunta la casella obbligatoria"; 
    }
		if (!data.displayName) { 
      errors.displayName = "Inserisci un nome utente"; 
    } else if (data.displayName.toLowerCase() === 'admin' || data.displayName.toLowerCase() === 'amministratore' || data.displayName.toLowerCase() === 'biblo.space') {
      errors.displayName = "Nome utente non permesso"; 
      // TODO: check further forbidden names
    }
		if (data.email) { 
			if (!isEmail(data.email)) errors.email = "Email non valida";
		} else { errors.email = "Inserisci un indirizzo email"; }
		if (!data.password) { errors.password = "Inserisci una password"; 
    } else if (data.password.length < 8) { errors.password = "Password troppo corta"; }
    // TODO: check password strength
		return errors;
	};

	render() {
    const { authError, checkedTerms, data, errors, redirectTo } = this.state;
    const { openSnackbar } = this.props;

		if (redirectTo) return <Redirect to={redirectTo} />

		return (
			<React.Fragment>
        <FormControlLabel 
          className="text-left" 
          style={{ marginRight: 0 }} 
          error={Boolean(errors.checkedTerms)}
          required
          label={
          <span style={{ fontSize: '0.875rem' }}>Accetto i <Link to="/terms">Termini</Link> e confermo la presa visione della <Link to="/privacy">Privacy policy</Link> di {app.name}</span>
        } control={
          <Checkbox checked={checkedTerms} onChange={this.toggleCheckbox('checkedTerms')} value="checkedTerms" />
        } />
        {errors.checkedTerms && <FormHelperText className="message error">{errors.checkedTerms}</FormHelperText>}
        
        <form onSubmit={this.onSubmit} noValidate style={{ marginTop: 20 }}>
          <SocialAuth disabled={!checkedTerms} openSnackbar={openSnackbar} />
          <div className="form-group">
            <FormControl className="input-field" margin="normal" fullWidth>
              <InputLabel error={Boolean(errors.displayName)} htmlFor="displayName">Nome e cognome</InputLabel>
              <Input
                id="displayName"
                name="displayName"
                type="text"
                autoFocus
                placeholder="Mario Rossi"
                value={data.displayName}
                onChange={this.onChange}
                error={Boolean(errors.displayName)}
              />
              {errors.displayName && <FormHelperText className="message error">{errors.displayName}</FormHelperText>}
            </FormControl>
          </div>

          <div className="form-group">
            <FormControl className="input-field" margin="normal" fullWidth>
              <InputLabel error={Boolean(errors.email)} htmlFor="email">Email</InputLabel>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="esempio@esempio.com"
                value={data.email}
                onChange={this.onChange}
                error={Boolean(errors.email)}
              />
              {errors.email && <FormHelperText className="message error">{errors.email}</FormHelperText>}
            </FormControl>
          </div>

          <div className="form-group">
            <FormControl className="input-field" margin="normal" fullWidth>
              <InputLabel error={Boolean(errors.password)} htmlFor="password">Password</InputLabel>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Almeno 8 caratteri"
                value={data.password}
                onChange={this.onChange}
                error={Boolean(errors.password)}
              />
              {errors.password && <FormHelperText className="message error">{errors.password}</FormHelperText>}
            </FormControl>
          </div>

          {authError && <div className="row"><div className="col message error">{authError}</div></div>}

          <div className="footer no-gutter">
            <button type="button" className="btn btn-footer primary" onClick={this.onSubmit}>Registrati</button>
          </div>
        </form>
      
			</React.Fragment>
		);
	}
}