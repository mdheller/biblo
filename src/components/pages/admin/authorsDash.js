import Avatar from '@material-ui/core/Avatar';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogTitle from '@material-ui/core/DialogTitle';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import React, { Component } from 'react';
import ImageZoom from 'react-medium-image-zoom';
import { Link, Redirect } from 'react-router-dom';
import { authorRef, authorsRef, countRef } from '../../../config/firebase';
import icon from '../../../config/icons';
import { getInitials, handleFirestoreError, imageZoomDefaultStyles, normalizeString, normURL, timeSince } from '../../../config/shared';
import { boolType, funcType } from '../../../config/types';
import CopyToClipboard from '../../copyToClipboard';
import PaginationControls from '../../paginationControls';

const limitBy = [ 15, 25, 50, 100, 250, 500];
const orderBy = [ 
  { type: 'lastEdit_num', label: 'Data ultima modifica' }, 
  { type: 'lastEditByUid', label: 'Modificato da' },
  { type: 'displayName', label: 'Nominativo' }, 
  { type: 'sex', label: 'Sesso' },
  { type: 'photoURL', label: 'Foto' }
];

export default class AuthorsDash extends Component {
 	state = {
    count: 0,
    desc: true,
    firstVisible: null,
    isOpenDeleteDialog: false,
    items: null,
    lastVisible: null,
    limitMenuAnchorEl: null,
    limitByIndex: 0,
    orderMenuAnchorEl: null,
    orderByIndex: 0,
    page: 1,
    selectedId: null,
    loading: false
	}

	static propTypes = {
    inView: boolType.isRequired,
    onToggleDialog: funcType.isRequired,
    openSnackbar: funcType.isRequired
  }

	componentDidMount() { 
    this._isMounted = true;
    if (this.props.inView) this.fetch();
  }
  
  componentDidUpdate(prevProps, prevState) {
    const { desc, items, limitByIndex, orderByIndex } = this.state;
    if (desc !== prevState.desc || limitByIndex !== prevState.limitByIndex || orderByIndex !== prevState.orderByIndex) {
      if (this.props.inView) this.fetch();
    }
    if (this.props.inView !== prevProps.inView && !items) {
      if (this.props.inView) this.fetch();
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
    this.unsubAuthorsFetch && this.unsubAuthorsFetch();
  }
    
  fetch = e => {
    const { desc, firstVisible, lastVisible, limitByIndex, orderByIndex } = this.state;
    const { openSnackbar } = this.props;
    const direction = e && e.currentTarget.dataset.direction;
    const prev = direction === 'prev';
    const limit = limitBy[limitByIndex];
    const ref = authorsRef.orderBy(orderBy[orderByIndex].type, desc === prev ? 'asc' : 'desc').limit(limit);
    const paginatedRef = ref.startAfter(prev ? firstVisible : lastVisible);
    const dRef = direction ? paginatedRef : ref;
    
    if (this._isMounted) this.setState({ loading: true });

    const fetcher = () => {
      this.unsubAuthorsFetch = dRef.onSnapshot(snap => {
        if (!snap.empty) {
          const items = [];
          snap.forEach(item => items.push(item.data()));
          this.setState(prevState => ({
            firstVisible: snap.docs[prev ? snap.size -1 : 0],
            items: prev ? items.reverse() : items,
            lastVisible: snap.docs[prev ? 0 : snap.size -1],
            loading: false,
            page: direction ? prev ? prevState.page > 1 ? prevState.page - 1 : 1 : (prevState.page * limit) > prevState.count ? prevState.page : prevState.page + 1 : 1
          }));
        } else this.setState({ firstVisible: null, items: null, lastVisible: null, loading: false, page: 1 });
      });
    }

    if (!direction) {
      countRef('authors').get().then(fullSnap => {
        if (fullSnap.exists) { 
          if (this._isMounted) {
            this.setState({ count: fullSnap.data().count }, () => fetcher());
          }
        } else if (this._isMounted) {
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

  onView = id => this.setState({ redirectTo: id });

  onEdit = id => this.props.onToggleDialog(id);

  onLock = (id, state) => {
    if (id) {
      if (state) {
        // console.log(`Locking ${id}`);
        authorRef(id).update({ edit: false }).then(() => {
          this.props.openSnackbar('Elemento bloccato', 'success');
        }).catch(error => console.warn(error));
      } else {
        // console.log(`Unlocking ${id}`);
        authorRef(id).update({ edit: true }).then(() => {
          this.props.openSnackbar('Elemento sbloccato', 'success');
        }).catch(error => console.warn(error));
      }
    }
  }

  onDeleteRequest = id => this.setState({ isOpenDeleteDialog: true, selectedId: id });
  onCloseDeleteDialog = () => this.setState({ isOpenDeleteDialog: false, selectedId: null });
  onDelete = () => {
    const { selectedId } = this.state;
    // console.log(`Deleting ${selectedId}`);
    authorRef(selectedId).delete().then(() => {
      this.setState({ isOpenDeleteDialog: false });
      this.props.openSnackbar('Elemento cancellato', 'success');
    }).catch(error => console.warn(error));
  }

	render() {
    const { count, desc, isOpenDeleteDialog, items, limitByIndex, limitMenuAnchorEl, loading, orderByIndex, orderMenuAnchorEl, page, redirectTo } = this.state;
    
    if (redirectTo) return <Redirect to={`/author/${redirectTo}`} />
    
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

    const limit = limitBy[limitByIndex];
    const skeletons = [...Array(limit)].map((e, i) => <li key={i} className="skltn dash" />);

    const itemsList = loading ? skeletons : !items ? <li className="empty text-center">Nessun elemento</li> : (
      items.map(item => (
        <li key={item.displayName} className={`avatar-row ${item.edit ? '' : 'locked'}`}>
          <div className="row">
            <div className="col-auto hide-xs avatar-container">
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
            <div className="col-6 col-sm-4 col-lg-2" title={item.displayName}><CopyToClipboard text={item.displayName}/></div>
            <div className="col-1"><button type="button" className="btn xs flat" title={item.sex === 'm' ? 'uomo' : 'donna'}>{item.sex}</button></div>
            <div className="col hide-lg" title={item.bio}>{item.bio}</div>
            <Link to={`/dashboard/${item.lastEditByUid}`} title={item.lastEditByUid} className="col col-sm-2 col-lg-1">{item.lastEditBy}</Link>
            <div className="col col-sm-2 col-lg-1 text-right">
              <div className="timestamp">{timeSince(item.lastEdit_num)}</div>
            </div>
            <div className="absolute-row right btns xs">
              <button type="button" className="btn icon green" onClick={() => this.onView(normURL(item.displayName))}>{icon.eye}</button>
              <button type="button" className="btn icon primary" onClick={() => this.onEdit(normalizeString(item.displayName))}>{icon.pencil}</button>
              <button type="button" className={`btn icon ${item.edit ? 'secondary' : 'flat' }`} onClick={() => this.onLock(normalizeString(item.displayName), item.edit)} title={item.edit ? 'Blocca' : 'Sblocca'}>{icon.lock}</button>
              <button type="button" className="btn icon red" onClick={() => this.onDeleteRequest(normalizeString(item.displayName))}>{icon.close}</button>
            </div>
          </div>
        </li>
      ))
    );

		return (
      <>
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
              <button type="button" className={`btn sm flat counter icon rounded ${desc ? 'desc' : 'asc'}`} title={desc ? 'Ascendente' : 'Discendente'} onClick={this.onToggleDesc}>{icon.arrowDown}</button>
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
        
        <ul className="table dense nolist font-sm">
          <li className="avatar-row labels">
            <div className="row">
              <div className="col-auto hide-xs"><div className="avatar hidden" title="avatar" /></div>
              <div className="col-6 col-sm-4 col-lg-2">Nominativo</div>
              <div className="col-1">Sesso</div>
              <div className="col hide-lg">Bio</div>
              <div className="col col-sm-2 col-lg-1">Modificato da</div>
              <div className="col col-sm-2 col-lg-1 text-right">Modificato</div>
            </div>
          </li>
          {itemsList}
        </ul>

        <PaginationControls 
          count={count} 
          fetch={this.fetch}
          forceVisibility
          limit={limit}
          page={page}
        />

        <Dialog
          open={isOpenDeleteDialog}
          keepMounted
          onClose={this.onCloseDeleteDialog}
          aria-labelledby="delete-dialog-title"
          aria-describedby="delete-dialog-description">
          <DialogTitle id="delete-dialog-title">Procedere con l&apos;eliminazione?</DialogTitle>
          <DialogActions className="dialog-footer flex no-gutter">
            <button type="button" className="btn btn-footer flat" onClick={this.onCloseDeleteDialog}>Annulla</button>
            <button type="button" className="btn btn-footer primary" onClick={this.onDelete}>Procedi</button>
          </DialogActions>
        </Dialog>
			</>
		);
	}
}