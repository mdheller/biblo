import FormControl from '@material-ui/core/FormControl';
import FormHelperText from '@material-ui/core/FormHelperText';
import Input from '@material-ui/core/Input';
import InputLabel from '@material-ui/core/InputLabel';
import React from 'react';
import { Link, Redirect } from 'react-router-dom';
import isEmail from 'validator/lib/isEmail';
import { auth } from '../../config/firebase';
import { app, handleFirestoreError } from '../../config/shared';
import { funcType } from '../../config/types';
import SocialAuth from '../socialAuth';

export default class LoginForm extends React.Component {
	state = {
    data: {
      email: '',
      password: ''
    },
    loading: false,
    errors: {},
    authError: '',
    redirectToReferrer: false
  }

  static propTypes = {
    openSnackbar : funcType.isRequired
  }

  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

	handleChange = e => {
		this.setState({ 
			data: { ...this.state.data, [e.target.name]: e.target.value }, errors: { ...this.state.errors, [e.target.name]: null }
		});
	};

	handleSubmit = e => {
    e.preventDefault();
    const { data } = this.state;
		if (this._isMounted) this.setState({ loading: true });
		const errors = this.validate(data);
		if (this._isMounted) this.setState({ authError: '', errors });
		if (Object.keys(errors).length === 0) {
			auth.signInWithEmailAndPassword(data.email, data.password).then(() => {
        if (this._isMounted) {
          this.setState({
            loading: false,
            redirectToReferrer: true
          });
        }
			}).catch(err => {
        console.warn(err);
        if (this._isMounted) {
          this.setState({
            authError: handleFirestoreError(err),
            loading: false
          });
        }
			});
		}
	};

	validate = data => {
		const errors = {};
		if (data.email) {
			if (!isEmail(data.email)) errors.email = "Email non valida";
		} else errors.email = "Inserisci un indirizzo email";
		if (!data.password) errors.password = "Inserisci una password";
		return errors;
	};

	render() {
    const { authError, data, errors, redirectToReferrer } = this.state;
    const { openSnackbar } = this.props;
    const { from } = { from: { pathname: '/' } };

		if (redirectToReferrer) return <Redirect to={from} />

		return (
			<div id="loginFormComponent">
				<SocialAuth openSnackbar={openSnackbar} />

        <div className="light-text pad-v-xs">
          <small>Effettuando il login confermi la presa visione della <Link to="/privacy">Privacy policy</Link> di {app.name}</small>
        </div>

				<form onSubmit={this.onSubmit} noValidate>
					<div className="form-group">
            <FormControl className="input-field" margin="normal" fullWidth>
              <InputLabel error={Boolean(errors.email)} htmlFor="email">Email</InputLabel>
              <Input
                id="email"
                name="email"
                type="email"
                autoFocus
                placeholder="esempio@esempio.com"
                value={data.email}
                onChange={this.handleChange}
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
                onChange={this.handleChange}
                error={Boolean(errors.password)}
              />
              {errors.password && <FormHelperText className="message error">{errors.password}</FormHelperText>}
            </FormControl>
					</div>

					{authError && <div className="row"><div className="col message error">{authError}</div></div>}

					<div className="footer no-gutter">
						<button type="button" className="btn btn-footer primary" onClick={this.handleSubmit}>Accedi</button>
					</div>
				</form>
			</div>
		);
	}
}