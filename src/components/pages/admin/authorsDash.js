import Avatar from '@material-ui/core/Avatar';
import CircularProgress from '@material-ui/core/CircularProgress';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import Popover from '@material-ui/core/Popover';
import React from 'react';
import Link from 'react-router-dom/Link';
import Redirect from 'react-router-dom/Redirect';
import { authorsRef } from '../../../config/firebase';
import { icon } from '../../../config/icons';
import { getInitials, normalizeString } from '../../../config/shared';
import { funcType, userType } from '../../../config/types';
import CopyToClipboard from '../../copyToClipboard';

export default class AuthorsDash extends React.Component {
 	state = {
    user: this.props.user,
    authors: null,
    count: 0,
    desc: true,
    limit: 15,
    orderMenuAnchorEl: null,
    orderBy: [ 
      { type: 'created_num', label: 'Data'}, 
      { type: 'displayName', label: 'Nome'}, 
      { type: 'sex', label: 'Sesso'}
    ],
    orderByIndex: 0,
    page: 1,
    loading: true
	}

	static propTypes = {
    openSnackbar: funcType.isRequired,
    user: userType
	}

  /* static getDerivedStateFromProps(props, state) {
    return null;
  }  */

	componentDidMount() { 
    this._isMounted = true; 
    this.fetch();
  }

	componentWillUnmount() { this._isMounted = false; }
  
  componentDidUpdate(prevProps, prevState) {
    const { desc, limit, orderByIndex } = this.state;
    if (this._isMounted) {
      if (desc !== prevState.desc || limit !== prevState.limit || orderByIndex !== prevState.orderByIndex) {
        this.fetch();
      }
    }
  }
    
  fetch = direction => {
    const { desc, limit, orderBy, orderByIndex, page } = this.state;
    const startAt = direction ? (direction === 'prev') ? ((page - 1) * limit) - limit : page * limit : 0;
    const aRef = authorsRef.orderBy(orderBy[orderByIndex].type, desc ? 'desc' : 'asc').limit(limit);
    //console.log('fetching authors');
    this.setState({ loading: true });
    
    authorsRef.get().then(fullSnap => {
      //console.log(fullSnap);
      if (!fullSnap.empty) {
        this.setState({ count: fullSnap.docs.length });
        let lastVisible = fullSnap.docs[startAt];
        //console.log({lastVisible, limit, direction, page});
        const ref = direction ? aRef.startAt(lastVisible) : aRef;
        ref.get().then(snap => {
          //console.log(snap);
          if (!snap.empty) {
            const authors = [];
            snap.forEach(author => authors.push({ ...author.data() }));
            this.setState(prevState => ({
              authors: authors,
              loading: false,
              page: direction ? (direction === 'prev') ? (prevState.page > 1) ? prevState.page - 1 : 1 : ((prevState.page * prevState.limit) > prevState.usersCount) ? prevState.page : prevState.page + 1 : 1
            }));
          } else this.setState({ authors: null, loading: false });
        });
      } else this.setState({ count: 0 });
    });
  }

  onChangeOrderBy = (e, i) => this.setState({ orderByIndex: i, orderMenuAnchorEl: null, page: 1 });

  onToggleDesc = () => this.setState(prevState => ({ desc: !prevState.desc }));

  onOpenOrderMenu = e => this.setState({ orderMenuAnchorEl: e.currentTarget });

  onCloseOrderMenu = () => this.setState({ orderMenuAnchorEl: null });

  onView = id => this.setState({ redirectTo: id });

  onEdit = aid => {
    console.log(`Editing ${aid}`);
    this.props.openSnackbar('Modifiche salvate', 'success');
  }

  onDelete = aid => {
    console.log(`Deleting ${aid}`);
    this.props.openSnackbar('Autore cancellato', 'success');
  }

	render() {
    const { authors, count, desc, limit, loading, orderBy, orderByIndex, orderMenuAnchorEl, page, redirectTo } = this.state;
    const { openSnackbar } = this.props;

    const authorsList = (authors && (authors.length > 0) &&
      authors.map((author) => 
        <li key={author.displayName} className="avatar-row">
          <div className="row">
            <Link to={`/author/${author.displayName}`} className="col-auto hide-xs">
              <Avatar className="avatar" src={author.photoURL} alt={author.displayName}>{!author.photoURL && getInitials(author.displayName)}</Avatar>
            </Link>
            <div className="col-2" title={author.displayName}><CopyToClipboard openSnackbar={openSnackbar} text={author.displayName}/></div>
            <div className="col-1"><button className="btn xs flat" title={author.sex === 'm' ? 'uomo' : 'donna'}>{author.sex}</button></div>
            <div className="col hide-sm">{author.bio}</div>
            <div className="col col-sm-2 col-lg-1 text-right">
              <div className="timestamp">{new Date(author.created_num).toLocaleDateString()}</div>
            </div>
            <div className="absolute-row right btns xs">
              <button className="btn icon success" onClick={e => this.onView(normalizeString(author.displayName))}>{icon.eye()}</button>
              <button className="btn icon primary" onClick={e => this.onEdit(normalizeString(author.displayName))}>{icon.pencil()}</button>
              <button className="btn icon secondary" onClick={e => this.onLock(normalizeString(author.displayName))}>{icon.lock()}</button>
              <button className="btn icon error" onClick={e => this.onDelete(normalizeString(author.displayName))}>{icon.close()}</button>
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

    if (redirectTo) return <Redirect to={`/author/${redirectTo}`} />

		return (
			<div className="container" id="authorsDashComponent">
        <div className="card dark" style={{ minHeight: 200 }}>
          <div className="head nav">
            <div className="row">
              <div className="col">
                <span className="counter hide-md">{`${authors ? authors.length : 0} di ${count || 0} autori`}</span>
              </div>
              <div className="col-auto">
                <span className="counter last hide-xs">Ordina per</span>
                <button className="btn sm flat counter" onClick={this.onOpenOrderMenu}>{orderBy[orderByIndex].label}</button>
                <button className={`btn sm flat counter ${desc ? 'desc' : 'asc'}`} title={desc ? 'Ascendente' : 'Discendente'} onClick={this.onToggleDesc}>{icon.arrowDown()}</button>
                <Popover 
                  open={Boolean(orderMenuAnchorEl)}
                  onClose={this.onCloseOrderMenu} 
                  anchorEl={orderMenuAnchorEl} 
                  anchorOrigin={{horizontal: 'right', vertical: 'bottom'}}
                  transformOrigin={{horizontal: 'right', vertical: 'top'}}>
                  <Menu 
                    anchorEl={orderMenuAnchorEl} 
                    open={Boolean(orderMenuAnchorEl)} 
                    onClose={this.onCloseOrderMenu}>
                    {orderByOptions}
                  </Menu>
                </Popover>
              </div>
            </div>
          </div>
          {loading ? 
            <div className="loader"><CircularProgress /></div> 
          : !authors ? 
            <div className="empty text-center">Nessun autore</div>
          :
            <ul className="table dense nolist font-sm">
              <li className="avatar-row labels">
                <div className="row">
                  <div className="col-auto hide-xs"><div className="avatar" title="avatar"></div></div>
                  <div className="col-2">Nominativo</div>
                  <div className="col-1">Sesso</div>
                  <div className="col hide-sm">Bio</div>
                  <div className="col col-sm-2 col-lg-1 text-right">Creato</div>
                </div>
              </li>
              {authorsList}
            </ul>
          }
          {count > limit &&
            <div className="info-row centered pagination">
              <button 
                disabled={page === 1 && 'disabled'} 
                className="btn flat" 
                onClick={() => this.fetch('prev')} title="precedente">
                {icon.chevronLeft()}
              </button>

              <button 
                disabled={page > (count / limit) && 'disabled'} 
                className="btn flat" 
                onClick={() => this.fetch('next')} title="successivo">
                {icon.chevronRight()}
              </button>
            </div>
          }
        </div>
			</div>
		);
	}
}