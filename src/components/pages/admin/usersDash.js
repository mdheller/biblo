import Avatar from '@material-ui/core/Avatar';
import CircularProgress from '@material-ui/core/CircularProgress';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import ImageZoom from 'react-medium-image-zoom';
import { Link, Redirect } from 'react-router-dom';
import { auth, countRef, noteRef, notesRef, userNotificationsRef, userRef, userShelfRef, usersRef } from '../../../config/firebase';
import icon from '../../../config/icons';
import { asyncForEach, dateOptions, getInitials, handleFirestoreError, imageZoomDefaultStyles, timeOptions } from '../../../config/shared';
import { funcType } from '../../../config/types';
import CopyToClipboard from '../../copyToClipboard';
import PaginationControls from '../../paginationControls';

const UsersDash = props => {
  const [state, setState] = useState({
    count: 0,
    desc: true,
    firstVisible: null,
    isOpenDeleteDialog: false,
    items: null,
    lastVisible: null,
    limitMenuAnchorEl: null,
    limitBy: [ 15, 25, 50, 100, 250, 500 ],
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
    selected: null,
    loading: true
  });
  
  const is = useRef(true);
  const sub = useRef();
  const { onToggleDialog, openSnackbar } = props;
  const { count, desc, firstVisible, isOpenDeleteDialog, items, lastVisible, limitBy, limitByIndex, limitMenuAnchorEl, loading, orderBy, orderByIndex, orderMenuAnchorEl, page, redirectTo, selected } = state;

  const fetch = useCallback(e => {
    const direction = e && e.currentTarget.dataset.direction;
    const prev = direction === 'prev';
    const limit = limitBy[limitByIndex];
    const ref = usersRef.orderBy(orderBy[orderByIndex].type, desc === prev ? 'asc' : 'desc').limit(limit);
    const paginatedRef = ref.startAfter(prev ? firstVisible : lastVisible);
    const dRef = direction ? paginatedRef : ref;

    if (is.current) setState(prevState => ({ ...prevState, loading: true }));

    const fetcher = () => {
      sub.current.usersFetch = dRef.onSnapshot(snap => {
        if (!snap.empty) {
          const items = [];
          snap.forEach(item => items.push(item.data()));
          setState(prevState => ({
            ...prevState,
            firstVisible: snap.docs[prev ? snap.size -1 : 0],
            items: prev ? items.reverse() : items,
            lastVisible: snap.docs[prev ? 0 : snap.size -1],
            loading: false,
            page: direction ? prev ? prevState.page - 1 : ((prevState.page * limit) > prevState.count) ? prevState.page : prevState.page + 1 : 1
          }));
        } else setState(prevState => ({ 
          ...prevState, 
          firstVisible: null, 
          items: null, 
          lastVisible: null, 
          loading: false 
        }));
      });
    }
    
    if (!direction) {
      countRef('users').get().then(fullSnap => {
        if (fullSnap.exists) {
          if (is.current) {
            setState(prevState => ({ ...prevState, count: fullSnap.data().count }));
            fetcher();
          }
        } else if (is.current) {
          setState(prevState => ({ ...prevState, count: 0 }));
        }
      }).catch(err => openSnackbar(handleFirestoreError(err), 'error'));
    } else fetcher();
  }, [desc, firstVisible, lastVisible, limitBy, limitByIndex, openSnackbar, orderBy, orderByIndex]);

  const onToggleDesc = () => setState(prevState => ({ ...prevState, desc: !prevState.desc }));
  
  const onOpenOrderMenu = e => setState(prevState => ({ ...prevState, orderMenuAnchorEl: e.currentTarget }));
  const onChangeOrderBy = (e, i) => setState(prevState => ({ ...prevState, orderByIndex: i, orderMenuAnchorEl: null, page: 1 }));
  const onCloseOrderMenu = () => setState(prevState => ({ ...prevState, orderMenuAnchorEl: null }));

  const onOpenLimitMenu = e => setState(prevState => ({ ...prevState, limitMenuAnchorEl: e.currentTarget }));
  const onChangeLimitBy = (e, i) => setState(prevState => ({ ...prevState, limitByIndex: i, limitMenuAnchorEl: null, page: 1 }));
  const onCloseLimitMenu = () => setState(prevState => ({ ...prevState, limitMenuAnchorEl: null }));

  const onView = e => {
    const { id } = e.currentTarget.parentNode.dataset;
    setState(prevState => ({ ...prevState, redirectTo: id }));
  }

  const onNote = e => {
    const { id } = e.currentTarget.parentNode.dataset;
    onToggleDialog(id);
  }

  const onSendReset = e => {
    const { email } = e.currentTarget.parentNode.dataset;
    auth.sendPasswordResetEmail(email).then(() => {
      openSnackbar(`Email inviata`, 'success');
    }).catch(err => openSnackbar(handleFirestoreError(err), 'error'));
  }

  /* const onSendVerification = () => {
    // TODO
  } */

  const onLock = e => {
    const { id } = e.currentTarget.parentNode.dataset;
    const state = e.currentTarget.parentNode.dataset.state === 'true';
    // console.log(`${state ? 'Un' : 'L'}ocking ${id}`);
    userRef(id).update({ 'roles.editor': !state }).then(() => {
      openSnackbar(`Elemento ${state ? '' : 's'}bloccato`, 'success');
    }).catch(err => openSnackbar(handleFirestoreError(err), 'error'));
  }

  const onDeleteRequest = e => {
    const { id } = e.currentTarget.parentNode.dataset;
    const displayName = e.currentTarget.parentNode.dataset.name;
    if (is.current) {
      setState(prevState => ({ ...prevState, isOpenDeleteDialog: true, selected: { displayName, id } }));
    }
  }
  const onCloseDeleteDialog = () => setState(prevState => ({ ...prevState, isOpenDeleteDialog: false, selected: null }));
  const onDelete = () => {
    const { selected } = state;
    const { openSnackbar } = props;
    
    if (is.current) setState(prevState => ({ ...prevState, isOpenDeleteDialog: false }));
    
    userRef(selected.id).delete().then(() => {
      console.log(`%c✔ user db deleted`, 'color: green');
      openSnackbar('Elemento cancellato', 'success');

      userShelfRef(selected.id).delete().then(() => {
        console.log(`%c✔ user reviews deleted`, 'color: green');
        openSnackbar('Recensioni cancellate', 'success');
      }).catch(err => openSnackbar(handleFirestoreError(err), 'error'));
    }).catch(err => openSnackbar(handleFirestoreError(err), 'error'));

    userNotificationsRef(selected.id).get().then(snap => {
      if (!snap.empty) {
        notesRef(selected.id).get().then(snap => {
          if (!snap.empty) {
            if (snap.docs.length < 500) {
              const notes = [];
              snap.forEach(item => notes.push(item.id));
              // console.log(notes);
              const deleteUserNotes = async () => {
                await asyncForEach(snap, item => {
                  noteRef(selected.id, item.id).delete().then(() => {
                    console.log(`• note ${item.id} deleted`);
                  }).catch(err => openSnackbar(handleFirestoreError(err), 'error'));
                });
                console.log(`%c✔ ${snap.docs.length} notes deleted`, 'color: green');
                openSnackbar(`${snap.docs.length} note cancellate`, 'success');
                userNotificationsRef(selected.id).delete().then(() => {
                  console.log(`%c✔ notifications collection deleted`, 'color: green');
                  // openSnackbar(`Collezione notifiche cancellata`, 'success');
                }).catch(err => openSnackbar(handleFirestoreError(err), 'error'));
              }
              deleteUserNotes();
            } else console.warn('Operation aborted: too many docs');
          } else console.log('No notes');
        }).catch(err => openSnackbar(handleFirestoreError(err), 'error'));
      } else console.log('No notifications collection');
    }).catch(err => openSnackbar(handleFirestoreError(err), 'error'));
    
    // TODO: delete all users, genres, authors and collections followed.
    
    onCloseDeleteDialog();
  }

  const onChangeRole = e => {
    const { id } = e.currentTarget.parentNode.dataset;
    const { role } = e.currentTarget.dataset;
    const state = e.currentTarget.dataset.state === 'true';
    userRef(id).update({ [`roles.${role}`]: !state }).catch(err => console.warn(err));
  }

  useEffect(() => {
    fetch();
    const unsub = sub.current;

    return () => {
      is.current = false;
      unsub.userFetch && unsub.usersFetch();
    }
    // eslint-disable-next-line
  }, []);

  const itemsList = (items && items.length && items.map(item => 
    <li key={item.uid} className={`avatar-row ${item.roles.editor ? '' : 'locked'}`}>
      <div className="row">
        <div className="col-auto avatar-container">
          <Avatar className="avatar" /* src={item.photoURL} */ alt={item.displayName}>
            {item.photoURL ? 
              <ImageZoom
                defaultStyles={imageZoomDefaultStyles}
                image={{ src: item.photoURL, className: 'thumb' }}
                zoomImage={{ className: 'magnified avatar' }}
              />
            : getInitials(item.displayName)}
          </Avatar>
        </div>
        <Link to={`/dashboard/${item.uid}`} className="col" title={item.displayName}>
          {item.displayName}
        </Link>
        <div className="col monotype hide-sm" title={item.uid}>
          <CopyToClipboard openSnackbar={openSnackbar} text={item.uid} />
        </div>
        <div className="col monotype hide-sm" title={item.email}>
          <CopyToClipboard openSnackbar={openSnackbar} text={item.email} />
        </div>
        <div className="col col-sm-3 col-lg-2 hide-xs">
          <div className="row text-center">
            <div className={`col ${!item.stats.shelf_num && 'lightest-text'}`}>{item.stats.shelf_num}</div>
            <div className={`col ${!item.stats.wishlist_num && 'lightest-text'}`}>{item.stats.wishlist_num}</div>
            <div className={`col ${!item.stats.reviews_num && 'lightest-text'}`}>{item.stats.reviews_num}</div>
            <div className={`col hide-md ${!item.stats.ratings_num && 'lightest-text'}`}>{item.stats.ratings_num}</div>
          </div>
        </div>
        <div role="group" className="col col-md-2 col-lg-1 btns xs text-center" data-id={item.uid}>
          <button type="button" className={`btn rounded icon ${item.roles.editor ? '' : 'flat'}`} data-role="editor" data-state={item.roles.editor} onClick={onChangeRole} title="editor">E</button>
          <button type="button" className={`btn rounded icon ${item.roles.premium ? '' : 'flat'}`} data-role="premium" data-state={item.roles.premium} onClick={onChangeRole} title="premium">P</button>
          <button type="button" className={`btn rounded icon ${item.roles.admin ? '' : 'flat'}`} data-role="admin" data-state={item.roles.admin} onClick={onChangeRole} title="admin">A</button>
        </div>
        <div className="col col-sm-2 col-lg text-right">
          <div className="timestamp">
            <span className="date">{new Date(item.creationTime).toLocaleDateString('it-IT', dateOptions)}</span><span className="time hide-lg"> - {new Date(item.creationTime).toLocaleTimeString('it-IT', timeOptions)}</span>
          </div>
        </div>
        <div className="absolute-row right btns xs" data-email={item.email} data-id={item.uid} data-name={item.displayName} data-state={item.roles.editor}>
          <button type="button" className="btn icon green" onClick={onView} title="anteprima">{icon.eye()}</button>
          <button type="button" className="btn icon primary" onClick={onNote} title="Invia notifica">{icon.bell()}</button>
          {/* <button type="button" className="btn icon primary" onClick={onSendVerification} title="Invia email di verifica">{icon.email()}</button> */}
          <button type="button" className="btn icon primary" onClick={onSendReset} title="Invia email di reset password">{icon.textboxPassword()}</button>
          <button type="button" className={`btn icon ${item.roles.editor ? 'secondary' : 'flat' }`} onClick={onLock} title={item.roles.editor ? 'Blocca' : 'Sblocca'}>{icon.lock()}</button>
          <button type="button" className="btn icon red" onClick={onDeleteRequest} title="elimina">{icon.close()}</button>
        </div>
      </div>
    </li>
  ));

  const orderByOptions = orderBy.map((option, index) => (
    <MenuItem
      key={option.type}
      disabled={index === -1}
      selected={index === orderByIndex}
      onClick={e => onChangeOrderBy(e, index)}>
      {option.label}
    </MenuItem>
  ));

  const limitByOptions = limitBy.map((option, index) => (
    <MenuItem
      key={option}
      disabled={index === -1}
      selected={index === limitByIndex}
      onClick={e => onChangeLimitBy(e, index)}>
      {option}
    </MenuItem>
  ));

  if (redirectTo) return <Redirect to={`/dashboard/${redirectTo}`} />

  return (
    <div className="container" id="usersDashComponent" ref={is}>
      <div className="card dark" style={{ minHeight: 200, }} ref={sub}>
        <div className="head nav">
          <div className="row">
            <div className="col">
              <span className="counter hide-md">{`${items ? items.length : 0} di ${count || 0}`}</span>
              <button type="button" className="btn sm flat counter last" onClick={onOpenLimitMenu}>{limitBy[limitByIndex]} <span className="hide-xs">per pagina</span></button>
              <Menu 
                className="dropdown-menu"
                anchorEl={limitMenuAnchorEl} 
                open={Boolean(limitMenuAnchorEl)} 
                onClose={onCloseLimitMenu}>
                {limitByOptions}
              </Menu>
            </div>
            <div className="col-auto">
              <button type="button" className="btn sm flat counter" onClick={onOpenOrderMenu}><span className="hide-xs">Ordina per</span> {orderBy[orderByIndex].label}</button>
              <button type="button" className={`btn sm flat counter ${desc ? 'desc' : 'asc'}`} title={desc ? 'Ascendente' : 'Discendente'} onClick={onToggleDesc}>{icon.arrowDown()}</button>
              <Menu 
                className="dropdown-menu"
                anchorEl={orderMenuAnchorEl} 
                open={Boolean(orderMenuAnchorEl)} 
                onClose={onCloseOrderMenu}>
                {orderByOptions}
              </Menu>
            </div>
          </div>
        </div>
        {loading ? 
          <div aria-hidden="true" className="loader"><CircularProgress /></div> 
        : !items ? 
          <div className="empty text-center">Nessun elemento</div>
        :
          <>
            <ul className="table dense nolist font-sm">
              <li className="avatar-row labels">
                <div className="row">
                  <div className="col-auto"><div className="avatar hidden" title="avatar" /></div>
                  <div className="col">Nominativo</div>
                  <div className="col hide-sm">Uid</div>
                  <div className="col hide-sm">Email</div>
                  <div className="col col-sm-3 col-lg-2 hide-xs">
                    <div className="row text-center">
                      <div className="col" title="Libri">{icon.book()}</div>
                      <div className="col" title="Desideri">{icon.heart()}</div>
                      <div className="col" title="Recensioni">{icon.review()}</div>
                      <div className="col hide-md" title="Voti">{icon.star()}</div>
                    </div>
                  </div>
                  <div className="col col-md-2 col-lg-1 text-center">Ruoli</div>
                  <div className="col col-sm-2 col-lg text-right">Creato</div>
                </div>
              </li>
              {itemsList}
            </ul>
            <PaginationControls 
              count={count} 
              fetch={fetch} 
              limit={limitBy[limitByIndex]}
              page={page}
            />
          </>
        }
      </div>

      {selected && 
        <Dialog
          open={isOpenDeleteDialog}
          keepMounted
          onClose={onCloseDeleteDialog}
          aria-labelledby="delete-dialog-title"
          aria-describedby="delete-dialog-description">
          <DialogTitle id="delete-dialog-title">Procedere con l&apos;eliminazione?</DialogTitle>
          <DialogContent>
            <DialogContentText id="delete-dialog-description">
              Cancellando l&apos;utente <b>{selected.displayName}</b> <small className="monotype">({selected.id})</small> verranno rimosse anche la sua libreria e le sue notifiche.
            </DialogContentText>
          </DialogContent>
          <DialogActions className="dialog-footer flex no-gutter">
            <button type="button" className="btn btn-footer flat" onClick={onCloseDeleteDialog}>Annulla</button>
            <button type="button" className="btn btn-footer primary" onClick={onDelete}>Procedi</button>
          </DialogActions>
        </Dialog>
      }
    </div>
  );
}

UsersDash.propTypes = {
  onToggleDialog: funcType.isRequired,
  openSnackbar: funcType.isRequired
}
 
export default UsersDash;





/* export default class UsersDash extends Component {
 	state = {
    count: 0,
    desc: true,
    firstVisible: null,
    isOpenDeleteDialog: false,
    items: null,
    lastVisible: null,
    limitMenuAnchorEl: null,
    limitBy: [ 15, 25, 50, 100, 250, 500 ],
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
    selected: null,
    loading: true
	}

	static propTypes = {
    onToggleDialog: funcType.isRequired,
    openSnackbar: funcType.isRequired
  }

	componentDidMount() { 
    is.current = true;
    this.fetch();
  }
  
  componentDidUpdate(prevProps, prevState) {
    const { desc, limitByIndex, orderByIndex } = this.state;
    if (desc !== prevState.desc || limitByIndex !== prevState.limitByIndex || orderByIndex !== prevState.orderByIndex) {
      this.fetch();
    }
  }

  componentWillUnmount() {
    is.current = false;
    this.unsubUsersFetch && this.unsubUsersFetch();
  }
    
  fetch = e => {
    const { desc, firstVisible, lastVisible, limitBy, limitByIndex, orderBy, orderByIndex } = this.state;
    const direction = e && e.currentTarget.dataset.direction;
    const prev = direction === 'prev';
    const limit = limitBy[limitByIndex];
    const ref = usersRef.orderBy(orderBy[orderByIndex].type, desc === prev ? 'asc' : 'desc').limit(limit);
    const paginatedRef = ref.startAfter(prev ? firstVisible : lastVisible);
    const dRef = direction ? paginatedRef : ref;

    if (is.current) this.setState({ loading: true });

    const fetcher = () => {
      this.unsubUsersFetch = dRef.onSnapshot(snap => {
        if (!snap.empty) {
          const items = [];
          snap.forEach(item => items.push(item.data()));
          this.setState(prevState => ({
            firstVisible: snap.docs[prev ? snap.size -1 : 0],
            items: prev ? items.reverse() : items,
            lastVisible: snap.docs[prev ? 0 : snap.size -1],
            loading: false,
            page: direction ? prev ? prevState.page - 1 : ((prevState.page * limit) > prevState.count) ? prevState.page : prevState.page + 1 : 1
          }));
        } else this.setState({ firstVisible: null, items: null, lastVisible: null, loading: false });
      });
    }
    
    if (!direction) {
      countRef('users').get().then(fullSnap => {
        if (fullSnap.exists) {
          if (is.current) {
            this.setState({ count: fullSnap.data().count }, () => fetcher());
          }
        } else if (is.current) {
          this.setState({ count: 0 });
        }
      }).catch(err => openSnackbar(handleFirestoreError(err), 'error'));
    } else fetcher();
  }

  onToggleDesc = () => this.setState(prevState => ({ desc: !prevState.desc }));
  
  onOpenOrderMenu = e => this.setState({ orderMenuAnchorEl: e.currentTarget });
  onChangeOrderBy = (e, i) => this.setState({ orderByIndex: i, orderMenuAnchorEl: null, page: 1 });
  onCloseOrderMenu = () => this.setState({ orderMenuAnchorEl: null });

  onOpenLimitMenu = e => this.setState({ limitMenuAnchorEl: e.currentTarget });
  onChangeLimitBy = (e, i) => this.setState({ limitByIndex: i, limitMenuAnchorEl: null, page: 1 });
  onCloseLimitMenu = () => this.setState({ limitMenuAnchorEl: null });

  onView = e => {
    const { id } = e.currentTarget.parentNode.dataset;
    this.setState({ redirectTo: id });
  }

  onNote = e => {
    const { id } = e.currentTarget.parentNode.dataset;
    this.props.onToggleDialog(id);
  }

  onSendReset = e => {
    const { email } = e.currentTarget.parentNode.dataset;
    auth.sendPasswordResetEmail(email).then(() => {
      openSnackbar(`Email inviata`, 'success');
    }).catch(err => openSnackbar(handleFirestoreError(err), 'error'));
  }

  onSendVerification = () => {
    // TODO
  }

  onLock = e => {
    const { id } = e.currentTarget.parentNode.dataset;
    const state = e.currentTarget.parentNode.dataset.state === 'true';
    // console.log(`${state ? 'Un' : 'L'}ocking ${id}`);
    userRef(id).update({ 'roles.editor': !state }).then(() => {
      openSnackbar(`Elemento ${state ? '' : 's'}bloccato`, 'success');
    }).catch(err => openSnackbar(handleFirestoreError(err), 'error'));
  }

  onDeleteRequest = e => {
    const { id } = e.currentTarget.parentNode.dataset;
    const displayName = e.currentTarget.parentNode.dataset.name;
    if (is.current) {
      this.setState({ isOpenDeleteDialog: true, selected: { displayName, id } });
    }
  }
  onCloseDeleteDialog = () => this.setState({ isOpenDeleteDialog: false, selected: null });
  onDelete = () => {
    const { selected } = this.state;
    const { openSnackbar } = this.props;
    
    if (is.current) this.setState({ isOpenDeleteDialog: false });
    
    userRef(selected.id).delete().then(() => {
      console.log(`%c✔ user db deleted`, 'color: green');
      openSnackbar('Elemento cancellato', 'success');

      userShelfRef(selected.id).delete().then(() => {
        console.log(`%c✔ user reviews deleted`, 'color: green');
        openSnackbar('Recensioni cancellate', 'success');
      }).catch(err => openSnackbar(handleFirestoreError(err), 'error'));
    }).catch(err => openSnackbar(handleFirestoreError(err), 'error'));

    userNotificationsRef(selected.id).get().then(snap => {
      if (!snap.empty) {
        notesRef(selected.id).get().then(snap => {
          if (!snap.empty) {
            if (snap.docs.length < 500) {
              const notes = [];
              snap.forEach(item => notes.push(item.id));
              // console.log(notes);
              const deleteUserNotes = async () => {
                await asyncForEach(snap, item => {
                  noteRef(selected.id, item.id).delete().then(() => {
                    console.log(`• note ${item.id} deleted`);
                  }).catch(err => openSnackbar(handleFirestoreError(err), 'error'));
                });
                console.log(`%c✔ ${snap.docs.length} notes deleted`, 'color: green');
                openSnackbar(`${snap.docs.length} note cancellate`, 'success');
                userNotificationsRef(selected.id).delete().then(() => {
                  console.log(`%c✔ notifications collection deleted`, 'color: green');
                  // openSnackbar(`Collezione notifiche cancellata`, 'success');
                }).catch(err => openSnackbar(handleFirestoreError(err), 'error'));
              }
              deleteUserNotes();
            } else console.warn('Operation aborted: too many docs');
          } else console.log('No notes');
        }).catch(err => openSnackbar(handleFirestoreError(err), 'error'));
      } else console.log('No notifications collection');
    }).catch(err => openSnackbar(handleFirestoreError(err), 'error'));
    
    // TODO: delete all users, genres, authors and collections followed.
    
    this.onCloseDeleteDialog();
  }

  onChangeRole = e => {
    const { id } = e.currentTarget.parentNode.dataset;
    const { role } = e.currentTarget.dataset;
    const state = e.currentTarget.dataset.state === 'true';
    userRef(id).update({ [`roles.${role}`]: !state }).catch(err => console.warn(err));
  }

	render() {
    const { count, desc, isOpenDeleteDialog, items, limitBy, limitByIndex, limitMenuAnchorEl, loading, orderBy, orderByIndex, orderMenuAnchorEl, page, redirectTo, selected } = this.state;
    const { openSnackbar } = this.props;

    const itemsList = (items && items.length && items.map(item => 
      <li key={item.uid} className={`avatar-row ${item.roles.editor ? '' : 'locked'}`}>
        <div className="row">
          <div className="col-auto avatar-container">
            <Avatar className="avatar" alt={item.displayName}>
              {item.photoURL ? 
                <ImageZoom
                  defaultStyles={imageZoomDefaultStyles}
                  image={{ src: item.photoURL, className: 'thumb' }}
                  zoomImage={{ className: 'magnified avatar' }}
                />
              : getInitials(item.displayName)}
            </Avatar>
          </div>
          <Link to={`/dashboard/${item.uid}`} className="col" title={item.displayName}>
            {item.displayName}
          </Link>
          <div className="col monotype hide-sm" title={item.uid}>
            <CopyToClipboard openSnackbar={openSnackbar} text={item.uid} />
          </div>
          <div className="col monotype hide-sm" title={item.email}>
            <CopyToClipboard openSnackbar={openSnackbar} text={item.email} />
          </div>
          <div className="col col-sm-3 col-lg-2 hide-xs">
            <div className="row text-center">
              <div className={`col ${!item.stats.shelf_num && 'lightest-text'}`}>{item.stats.shelf_num}</div>
              <div className={`col ${!item.stats.wishlist_num && 'lightest-text'}`}>{item.stats.wishlist_num}</div>
              <div className={`col ${!item.stats.reviews_num && 'lightest-text'}`}>{item.stats.reviews_num}</div>
              <div className={`col hide-md ${!item.stats.ratings_num && 'lightest-text'}`}>{item.stats.ratings_num}</div>
            </div>
          </div>
          <div role="group" className="col col-md-2 col-lg-1 btns xs text-center" data-id={item.uid}>
            <button type="button" className={`btn rounded icon ${item.roles.editor ? '' : 'flat'}`} data-role="editor" data-state={item.roles.editor} onClick={this.onChangeRole} title="editor">E</button>
            <button type="button" className={`btn rounded icon ${item.roles.premium ? '' : 'flat'}`} data-role="premium" data-state={item.roles.premium} onClick={this.onChangeRole} title="premium">P</button>
            <button type="button" className={`btn rounded icon ${item.roles.admin ? '' : 'flat'}`} data-role="admin" data-state={item.roles.admin} onClick={this.onChangeRole} title="admin">A</button>
          </div>
          <div className="col col-sm-2 col-lg text-right">
            <div className="timestamp">
              <span className="date">{new Date(item.creationTime).toLocaleDateString('it-IT', dateOptions)}</span><span className="time hide-lg"> - {new Date(item.creationTime).toLocaleTimeString('it-IT', timeOptions)}</span>
            </div>
          </div>
          <div className="absolute-row right btns xs" data-email={item.email} data-id={item.uid} data-name={item.displayName} data-state={item.roles.editor}>
            <button type="button" className="btn icon green" onClick={this.onView} title="anteprima">{icon.eye()}</button>
            <button type="button" className="btn icon primary" onClick={this.onNote} title="Invia notifica">{icon.bell()}</button>
            <button type="button" className="btn icon primary" onClick={this.onSendReset} title="Invia email di reset password">{icon.textboxPassword()}</button>
            <button type="button" className={`btn icon ${item.roles.editor ? 'secondary' : 'flat' }`} onClick={this.onLock} title={item.roles.editor ? 'Blocca' : 'Sblocca'}>{icon.lock()}</button>
            <button type="button" className="btn icon red" onClick={this.onDeleteRequest} title="elimina">{icon.close()}</button>
          </div>
        </div>
      </li>
    ));

    const orderByOptions = orderBy.map((option, index) => (
      <MenuItem
        key={option.type}
        disabled={index === -1}
        selected={index === orderByIndex}
        onClick={e => this.onChangeOrderBy(e, index)}>
        {option.label}
      </MenuItem>
    ));

    const limitByOptions = limitBy.map((option, index) => (
      <MenuItem
        key={option}
        disabled={index === -1}
        selected={index === limitByIndex}
        onClick={e => this.onChangeLimitBy(e, index)}>
        {option}
      </MenuItem>
    ));

    if (redirectTo) return <Redirect to={`/dashboard/${redirectTo}`} />

		return (
			<div className="container" id="usersDashComponent">
        <div className="card dark" style={{ minHeight: 200, }}>
          <div className="head nav">
            <div className="row">
              <div className="col">
                <span className="counter hide-md">{`${items ? items.length : 0} di ${count || 0}`}</span>
                <button type="button" className="btn sm flat counter last" onClick={this.onOpenLimitMenu}>{limitBy[limitByIndex]} <span className="hide-xs">per pagina</span></button>
                <Menu 
                  className="dropdown-menu"
                  anchorEl={limitMenuAnchorEl} 
                  open={Boolean(limitMenuAnchorEl)} 
                  onClose={this.onCloseLimitMenu}>
                  {limitByOptions}
                </Menu>
              </div>
              <div className="col-auto">
                <button type="button" className="btn sm flat counter" onClick={this.onOpenOrderMenu}><span className="hide-xs">Ordina per</span> {orderBy[orderByIndex].label}</button>
                <button type="button" className={`btn sm flat counter ${desc ? 'desc' : 'asc'}`} title={desc ? 'Ascendente' : 'Discendente'} onClick={this.onToggleDesc}>{icon.arrowDown()}</button>
                <Menu 
                  className="dropdown-menu"
                  anchorEl={orderMenuAnchorEl} 
                  open={Boolean(orderMenuAnchorEl)} 
                  onClose={this.onCloseOrderMenu}>
                  {orderByOptions}
                </Menu>
              </div>
            </div>
          </div>
          {loading ? 
            <div aria-hidden="true" className="loader"><CircularProgress /></div> 
          : !items ? 
            <div className="empty text-center">Nessun elemento</div>
          :
            <>
              <ul className="table dense nolist font-sm">
                <li className="avatar-row labels">
                  <div className="row">
                    <div className="col-auto"><div className="avatar hidden" title="avatar" /></div>
                    <div className="col">Nominativo</div>
                    <div className="col hide-sm">Uid</div>
                    <div className="col hide-sm">Email</div>
                    <div className="col col-sm-3 col-lg-2 hide-xs">
                      <div className="row text-center">
                        <div className="col" title="Libri">{icon.book()}</div>
                        <div className="col" title="Desideri">{icon.heart()}</div>
                        <div className="col" title="Recensioni">{icon.review()}</div>
                        <div className="col hide-md" title="Voti">{icon.star()}</div>
                      </div>
                    </div>
                    <div className="col col-md-2 col-lg-1 text-center">Ruoli</div>
                    <div className="col col-sm-2 col-lg text-right">Creato</div>
                  </div>
                </li>
                {itemsList}
              </ul>
              <PaginationControls 
                count={count} 
                fetch={this.fetch} 
                limit={limitBy[limitByIndex]}
                page={page}
              />
            </>
          }
        </div>

        {selected && 
          <Dialog
            open={isOpenDeleteDialog}
            keepMounted
            onClose={this.onCloseDeleteDialog}
            aria-labelledby="delete-dialog-title"
            aria-describedby="delete-dialog-description">
            <DialogTitle id="delete-dialog-title">Procedere con l&apos;eliminazione?</DialogTitle>
            <DialogContent>
              <DialogContentText id="delete-dialog-description">
                Cancellando l&apos;utente <b>{selected.displayName}</b> <small className="monotype">({selected.id})</small> verranno rimosse anche la sua libreria e le sue notifiche.
              </DialogContentText>
            </DialogContent>
            <DialogActions className="dialog-footer flex no-gutter">
              <button type="button" className="btn btn-footer flat" onClick={this.onCloseDeleteDialog}>Annulla</button>
              <button type="button" className="btn btn-footer primary" onClick={this.onDelete}>Procedi</button>
            </DialogActions>
          </Dialog>
        }
			</div>
		);
	}
} */