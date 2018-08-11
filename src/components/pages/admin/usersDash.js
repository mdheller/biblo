import Avatar from '@material-ui/core/Avatar';
import CircularProgress from '@material-ui/core/CircularProgress';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogTitle from '@material-ui/core/DialogTitle';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import React from 'react';
import Link from 'react-router-dom/Link';
import Redirect from 'react-router-dom/Redirect';
import { userRef, usersRef } from '../../../config/firebase';
import { icon } from '../../../config/icons';
import { getInitials } from '../../../config/shared';
import { funcType, userType } from '../../../config/types';
import CopyToClipboard from '../../copyToClipboard';

export default class UsersDash extends React.Component {
 	state = {
    user: this.props.user,
    count: 0,
    desc: true,
    isOpenDeleteDialog: false,
    items: null,
    limitMenuAnchorEl: null,
    limitBy: [ 15, 25, 50, 100, 250, 500],
    limitByIndex: 0,
    orderMenuAnchorEl: null,
    orderBy: [ 
      { type: 'creationTime', label: 'Data'}, 
      { type: 'displayName', label: 'Nome'}, 
      { type: 'uid', label: 'uid'}, 
      { type: 'email', label: 'Email'},
      { type: 'stats.shelf_num', label: 'Libri'},
      { type: 'stats.wishlist_num', label: 'Desideri'},
      { type: 'stats.reviews_num', label: 'Recensioni'},
      { type: 'stats.ratings_num', label: 'Voti'}
    ],
    orderByIndex: 0,
    page: 1,
    selectedId: null,
    loading: true
	}

	static propTypes = {
    openSnackbar: funcType.isRequired,
    user: userType
	}

  /* static getDerivedStateFromProps(props, state) {
    return null;
  } */ 

	componentDidMount() { 
    this._isMounted = true; 
    this.fetch();
  }

	componentWillUnmount() { this._isMounted = false; }
  
  componentDidUpdate(prevProps, prevState) {
    const { desc, limitByIndex, orderByIndex } = this.state;
    if (this._isMounted) {
      if (desc !== prevState.desc || limitByIndex !== prevState.limitByIndex || orderByIndex !== prevState.orderByIndex) {
        this.fetch();
      }
    }
  }
    
  fetch = direction => {
    const { desc, limitBy, limitByIndex, orderBy, orderByIndex, page } = this.state;
    const limit = limitBy[limitByIndex];
    const startAt = direction ? (direction === 'prev') ? ((page - 1) * limit) - limit : page * limit : 0;
    const uRef = usersRef.orderBy(orderBy[orderByIndex].type, desc ? 'desc' : 'asc').limit(limit);
    //console.log('fetching items');
    this.setState({ loading: true });
    
    usersRef.get().then(fullSnap => {
      //console.log(fullSnap);
      if (!fullSnap.empty) {
        this.setState({ count: fullSnap.docs.length });
        let lastVisible = fullSnap.docs[startAt];
        //console.log({lastVisible, limit, direction, page});
        const ref = direction ? uRef.startAt(lastVisible) : uRef;
        ref.onSnapshot(snap => {
          //console.log(snap);
          if (!snap.empty) {
            const items = [];
            snap.forEach(item => items.push(item.data()));
            this.setState(prevState => ({
              items: items,
              loading: false,
              page: direction ? (direction === 'prev') ? prevState.page - 1 : ((prevState.page * limit) > prevState.count) ? prevState.page : prevState.page + 1 : 1
            }));
          } else this.setState({ items: null, loading: false });
        });
      } else this.setState({ count: 0 });
    }).catch(error => console.warn(error));
  }

  onToggleDesc = () => this.setState(prevState => ({ desc: !prevState.desc }));
  
  onOpenOrderMenu = e => this.setState({ orderMenuAnchorEl: e.currentTarget });
  onChangeOrderBy = (e, i) => this.setState({ orderByIndex: i, orderMenuAnchorEl: null, page: 1 });
  onCloseOrderMenu = () => this.setState({ orderMenuAnchorEl: null });

  onOpenLimitMenu = e => this.setState({ limitMenuAnchorEl: e.currentTarget });
  onChangeLimitBy = (e, i) => this.setState({ limitByIndex: i, limitMenuAnchorEl: null, page: 1 });
  onCloseLimitMenu = () => this.setState({ limitMenuAnchorEl: null });

  onView = id => this.setState({ redirectTo: id });

  onSendNote = id => {
    console.log(`Sending notification to ${id}`);
    //TODO
    this.props.openSnackbar('Notifica inviata', 'success');
  }

  onLock = (id, state) => {
    console.log(`Locking ${id}`);
    if (state) {
      //console.log(`Locking ${id}`);
      userRef(id).update({ 'roles.editor': false }).then(() => {
        this.props.openSnackbar('Libro bloccato', 'success');
      }).catch(error => console.warn(error));
    } else {
      //console.log(`Unlocking ${id}`);
      userRef(id).update({ 'roles.editor': true }).then(() => {
        this.props.openSnackbar('Libro sbloccato', 'success');
      }).catch(error => console.warn(error));
    }
    this.props.openSnackbar('Utente bloccato', 'success');
  }

  onDeleteRequest = id => this.setState({ isOpenDeleteDialog: true, selectedId: id });
  onCloseDeleteDialog = () => this.setState({ isOpenDeleteDialog: false, selectedId: null });
  onDelete = () => {
    console.log(`Deleting ${this.state.selectedId}`);
    this.setState({ isOpenDeleteDialog: false });
    this.props.openSnackbar('Elemento cancellato', 'success');
  }

	render() {
    const { count, desc, isOpenDeleteDialog, items, limitBy, limitByIndex, limitMenuAnchorEl, loading, orderBy, orderByIndex, orderMenuAnchorEl, page, redirectTo } = this.state;
    const { openSnackbar } = this.props;

    const itemsList = (items && (items.length > 0) &&
      items.map((user) => 
        <li key={user.uid} className={`avatar-row ${user.roles.editor ? '' : 'locked'}`}>
          <div className="row">
            <div className="col-auto hide-xs avatar-container">
              <Avatar className="avatar" src={user.photoURL} alt={user.displayName}>{!user.photoURL && getInitials(user.displayName)}</Avatar>
            </div>
            <Link to={`/dashboard/${user.uid}`} className="col hide-sm" title={user.displayName}>
              {user.displayName}
            </Link>
            <div className="col monotype" title={user.uid}>
              <CopyToClipboard openSnackbar={openSnackbar} text={user.uid}/>
            </div>
            <div className="col monotype hide-sm" title={user.email}>
              <CopyToClipboard openSnackbar={openSnackbar} text={user.email}/>
            </div>
            <div className="col col-sm-3 col-lg-2">
              <div className="row text-center">
                <div className="col">{user.stats.shelf_num}</div>
                <div className="col">{user.stats.wishlist_num}</div>
                <div className="col">{user.stats.reviews_num}</div>
                <div className="col">{user.stats.ratings_num}</div>
              </div>
            </div>
            <div className="col col-sm-3 col-lg-2 btns xs">
              <div className={`btn ${user.roles.editor ? 'selected' : 'flat'}`} title="editor">E</div>
              <div className={`btn ${user.roles.premium ? 'selected' : 'flat'}`} title="premium">P</div>
              <div className={`btn ${user.roles.admin ? 'selected' : 'flat'}`} title="admin">A</div>
            </div>
            <div className="col col-sm-2 col-lg-1 text-right">
              <div className="timestamp">{new Date(user.creationTime).toLocaleDateString()}</div>
            </div>
            <div className="absolute-row right btns xs">
              <button className="btn icon green" onClick={e => this.onView(user.uid)} title="anteprima">{icon.eye()}</button>
              <button className="btn icon primary" onClick={e => this.onSendNote(user.uid)} title="Invia notifica">{icon.comment()}</button>
              <button className={`btn icon ${user.roles.editor ? 'secondary' : 'flat' }`} onClick={e => this.onLock(user.uid, user.roles.editor)} title={user.roles.editor ? 'Blocca' : 'Sblocca'}>{icon.lock()}</button>
              <button className="btn icon red" onClick={e => this.onDeleteRequest(user.uid)} title="elimina">{icon.close()}</button>
            </div>
          </div>
        </li>
      )
    );

    const orderByOptions = orderBy.map((option, index) => (
      <MenuItem
        key={option.type}
        disabled={index === -1}
        selected={index === orderByIndex}
        onClick={event => this.onChangeOrderBy(event, index)}>
        {option.label}
      </MenuItem>
    ));

    const limitByOptions = limitBy.map((option, index) => (
      <MenuItem
        key={option}
        disabled={index === -1}
        selected={index === limitByIndex}
        onClick={event => this.onChangeLimitBy(event, index)}>
        {option}
      </MenuItem>
    ));

    if (redirectTo) return <Redirect to={`/dashboard/${redirectTo}`} />

		return (
			<div className="container" id="usersDashComponent">
        <div className="card dark" style={{ minHeight: 200 }}>
          <div className="head nav">
            <div className="row">
              <div className="col">
                <span className="counter hide-md">{`${items ? items.length : 0} di ${count || 0} utenti`}</span>
                <button className="btn sm flat counter last" onClick={this.onOpenLimitMenu}>{limitBy[limitByIndex]} <span className="hide-xs">per pagina</span></button>
                <Menu 
                  anchorEl={limitMenuAnchorEl} 
                  open={Boolean(limitMenuAnchorEl)} 
                  onClose={this.onCloseLimitMenu}>
                  {limitByOptions}
                </Menu>
              </div>
              <div className="col-auto">
                <button className="btn sm flat counter" onClick={this.onOpenOrderMenu}><span className="hide-xs">Ordina per</span> {orderBy[orderByIndex].label}</button>
                <button className={`btn sm flat counter ${desc ? 'desc' : 'asc'}`} title={desc ? 'Ascendente' : 'Discendente'} onClick={this.onToggleDesc}>{icon.arrowDown()}</button>
                <Menu 
                  anchorEl={orderMenuAnchorEl} 
                  open={Boolean(orderMenuAnchorEl)} 
                  onClose={this.onCloseOrderMenu}>
                  {orderByOptions}
                </Menu>
              </div>
            </div>
          </div>
          {loading ? 
            <div className="loader"><CircularProgress /></div> 
          : !items ? 
            <div className="empty text-center">Nessun elemento</div>
          :
            <ul className="table dense nolist font-sm">
              <li className="avatar-row labels">
                <div className="row">
                  <div className="col-auto hide-xs"><div className="avatar" title="avatar"></div></div>
                  <div className="col hide-sm">Nominativo</div>
                  <div className="col">Uid</div>
                  <div className="col hide-sm">Email</div>
                  <div className="col col-sm-3 col-lg-2">
                    <div className="row text-center">
                      <div className="col" title="Libri">{icon.book()}</div>
                      <div className="col" title="Desideri">{icon.heart()}</div>
                      <div className="col" title="Recensioni">{icon.review()}</div>
                      <div className="col" title="Voti">{icon.star()}</div>
                    </div>
                  </div>
                  <div className="col col-sm-3 col-lg-2">Ruoli</div>
                  <div className="col col-sm-2 col-lg-1 text-right">Creato</div>
                </div>
              </li>
              {itemsList}
            </ul>
          }
          {items && count > limitBy[limitByIndex] &&
            <div className="info-row centered pagination">
              <button 
                disabled={page === 1 && 'disabled'} 
                className="btn flat" 
                onClick={() => this.fetch('prev')} title="precedente">
                {icon.chevronLeft()}
              </button>

              <button 
                disabled={page > (count / limitBy[limitByIndex]) && 'disabled'} 
                className="btn flat" 
                onClick={() => this.fetch('next')} title="successivo">
                {icon.chevronRight()}
              </button>
            </div>
          }
        </div>

        <Dialog
          open={isOpenDeleteDialog}
          keepMounted
          onClose={this.onCloseDeleteDialog}
          aria-labelledby="delete-dialog-title"
          aria-describedby="delete-dialog-description">
          <DialogTitle id="delete-dialog-title">Procedere con l'eliminazione?</DialogTitle>
          <DialogActions>
            <button className="btn flat" onClick={this.onCloseDeleteDialog}>Annulla</button>
            <button className="btn primary" onClick={this.onDelete}>Procedi</button>
          </DialogActions>
        </Dialog>
			</div>
		);
	}
}