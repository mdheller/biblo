import AppBar from '@material-ui/core/AppBar';
import Avatar from '@material-ui/core/Avatar';
import CircularProgress from '@material-ui/core/CircularProgress';
import Tab from '@material-ui/core/Tab';
import Tabs from '@material-ui/core/Tabs';
import Tooltip from '@material-ui/core/Tooltip';
import React, { lazy, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import ImageZoom from 'react-medium-image-zoom';
import { Link } from 'react-router-dom';
import SwipeableViews from 'react-swipeable-views';
import { bindKeyboard } from 'react-swipeable-views-utils';
import { followersRef, followingsRef, isAuthenticated, notesRef, userRef } from '../../config/firebase';
import icon from '../../config/icons';
import { dashboardTabs as tabs, profileKeys } from '../../config/lists';
import { app, calcAge, getInitials, imageZoomDefaultStyles, isTouchDevice, joinToLowerCase, screenSize, timeSince, timestamp, truncateString } from '../../config/shared';
import { historyType, locationType, matchType } from '../../config/types';
import SnackbarContext from '../../context/snackbarContext';
import UserContext from '../../context/userContext';
import '../../css/dashboard.css';
import Reviews from '../reviews';
// import PaginationControls from '../paginationControls'; // TODO
import Shelf from '../shelf';

const NoMatch = lazy(() => import('../noMatch'));

const BindKeyboardSwipeableViews = bindKeyboard(SwipeableViews);

const tabDir = null;

const unsub = {
  userFetch: null,
  collectionFetch: null,
  luidFollowersFetch: null,
  luidFollowingsFetch: null,
  uidFollowersFetch: null,
  uidFollowingsFetch: null
};

const skltnStyle = { margin: '.4em 0', };

const Dashboard = props => {
  const { user } = useContext(UserContext);
  const { openSnackbar } = useContext(SnackbarContext);
  const { history, location, match } = props;
  const tab = match.params && match.params.tab;
  const [uid, setUid] = useState(null);
  const [luid, setLuid] = useState(null);
  const [duser, setDuser] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [challenges, setChallenges] = useState([]);
  const [followers, setFollowers] = useState({});
  // const [followersCount, setFollowersCount] = useState(0);
  // const [followersPage, setFollowersPage] = useState(1);
  const [followings, setFollowings] = useState({});
  // const [followingsCount, setFollowingsCount] = useState(0);
  // const [followingsPage, setFollowingsPage] = useState(1);
  const [follow, setFollow] = useState(false);
  const [lfollowers, setLfollowers] = useState({});
  const [lfollowings, setLfollowings] = useState({});
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [tabSelected, setTabSelected] = useState(tab ? tabs.indexOf(tab) !== -1 ? tabs.indexOf(tab) : 0 : 0);
  const [_screenSize, setScreenSize] = useState(screenSize());
  const is = useRef(true);

  useEffect(() => {
    const updateScreenSize = () => {
      if (is.current) setScreenSize(screenSize());
    };
    
    window.addEventListener('resize', updateScreenSize);
    
    return () => {
      is.current = false;
      window.removeEventListener('resize', updateScreenSize);
    }
  }, []);

  const fetchUser = useCallback(() => {
    if (uid) {
      if (is.current) setLoading(true);
  
      unsub.userFetch && unsub.userFetch();
      unsub.userFetch = userRef(uid).onSnapshot(snap => {
        if (snap.exists) {
          let count = 0;
          const keys = Object.keys(snap.data()).filter(item => profileKeys.includes(item));
          const tot = profileKeys.length;
          // console.log(keys, profileKeys);
          keys.forEach(i => { 
            // console.log(i + ': ' + typeof snap.data()[i] + ' - ' + snap.data()[i]);
            if (typeof snap.data()[i] === 'string') {
              if (snap.data()[i] !== '') count++ 
            } else if (Array.isArray(snap.data()[i])) {
              if (snap.data()[i].length > 0) count++ 
            } else count++
          });
          // console.log(count, tot);
          setDuser(snap.data());
          setIsOwner(luid ? luid === uid : false);
          setLoading(false);
          setProgress(Number((100 / tot * count).toFixed(0)));
        } else {
          setDuser(null);
          setIsOwner(false);
          setLoading(false);
          setProgress(0);
        }
      });
    }
  }, [luid, uid]);

  const fetchFollowers = useCallback(() => {
    if (uid) {
      unsub.uidFollowersFetch && unsub.uidFollowersFetch();
      unsub.uidFollowersFetch = followersRef(uid).onSnapshot(snap => {
        if (snap.exists) {
          setFollowers(snap.data());
          // setFollowersCount(10); // TODO
          setFollow(luid ? Object.keys(snap.data()).indexOf(luid) > -1 : false);
        } else {
          setFollowers({});
          // setFollowersCount(0); 
          setFollow(false);
        }
      });
      if (isAuthenticated()) {
        if (luid && luid !== uid) {
          // console.log('fetching lfollowers');
          unsub.luidFollowersFetch && unsub.luidFollowersFetch();
          unsub.luidFollowersFetch = followersRef(luid).onSnapshot(snap => {
            if (snap.exists) {
              setLfollowers(snap.data());
            } else {
              setLfollowers({});
            }
          });
        }
      }
    }
	}, [luid, uid]);

	const fetchFollowings = useCallback(() => {
    if (uid) {
      unsub.uidFollowingsFetch && unsub.uidFollowingsFetch();
      unsub.uidFollowingsFetch = followingsRef(uid).onSnapshot(snap => {
        if (snap.exists) {
          setFollowings(snap.data()); 
          // setFollowingsCount(10); // TODO
          // console.log({ uid, followings: snap.data() });
        } else {
          setFollowings({});
          // setFollowingsCount(0);
        }
      });
      
      if (luid && luid !== uid) {
        // console.log('fetching lfollowings');
        unsub.luidFollowingsFetch && unsub.luidFollowingsFetch();
        unsub.luidFollowingsFetch = followingsRef(luid).onSnapshot(snap => {
          if (snap.exists) {
            setLfollowings(snap.data());
            // console.log({ luid, lfollowings: snap.data() });
          } else {
            setLfollowings({});
          }
        });
      }
    }
  }, [luid, uid]);

  const fetchUserChallenges = useCallback(() => {
		if (luid) {
      unsub.collectionFetch = userRef(luid).collection('challenges').onSnapshot(snap => {
        if (!snap.empty) {
          const challenges = [];
          snap.forEach(doc => challenges.push(doc.data()));
          setChallenges(challenges);
        } // else console.log(`No challenges for user ${luid}`);
      });
    }
  }, [luid]);
  
  const initUid = useCallback(() => {
    if (match.params.uid !== uid) { 
      setUid(match.params.uid);
      setIsOwner(luid === match.params.uid);
    }
  }, [luid, match.params.uid, uid]);

  const initLuid = useCallback(() => {
    if (user !== duser) { 
      if (user) {
        setLuid(user.uid);
        setIsOwner(user.uid === uid);
      } else {
        setLuid(null);
        setIsOwner(false);
      }
    }
  }, [duser, uid, user]);

  useEffect(() => {
    initUid();
  }, [initUid]);

  useEffect(() => {
    initLuid();
  }, [initLuid]);
  
  useEffect(() => {
    if (uid) {
      fetchUser();
      fetchFollowers();
      fetchFollowings();
      fetchUserChallenges();
    }
  }, [fetchUser, fetchFollowers, fetchFollowings, fetchUserChallenges, uid]);

  useEffect(() => {
    if (uid) {
      if (tabSelected === 0) {
        const newPath = `/dashboard/${uid}/${tabs[0]}`;
        if (history !== newPath) {
          history.replace(newPath, null);
        }
      }
    }
  }, [history, tabSelected, uid]);

  useEffect(() => {
    if (user && isOwner && !user.photoURL) {
      const msg = 'Non hai ancora caricato una foto profilo.'
      const action = <Link to="/profile" type="button" className="btn sm flat">Fallo adesso</Link>;
      setTimeout(() => {
        openSnackbar(msg, 'info', 6000, action);
      }, 3000);
    }
  }, [isOwner, openSnackbar, user]);

  useEffect(() => {
    if (tabs.indexOf(tab) !== -1) {
      if (tabs.indexOf(tab) !== tabSelected) {
        if (is.current) {
          setTabSelected(tabs.indexOf(tab));
        }
      }
    }
  }, [tab, tabSelected]);

  useEffect(() => {
    fetchUserChallenges();
  }, [fetchUserChallenges]);

  const onFollowUser = useCallback((e, fuid = duser.uid, fuser = duser) => {
    e.preventDefault();
    
		if (isAuthenticated()) {
			let computedFollowers = luid !== fuid ? { ...followers } : { ...lfollowers };
			let computedFollowings = luid !== uid ? { ...lfollowings } : { ...followings };
			// console.log({ luid, fuid, computedFollowers, computedFollowings, followers, followings, lfollowers, lfollowings });
      let snackbarMsg = '';
      let noteMsg = '';
      let followerDisplayName = '';
      const lindex = Object.keys(computedFollowers).indexOf(luid);
			const findex = Object.keys(computedFollowings).indexOf(fuid);			
			// console.log({ fuid, fuser, lindex, findex });

      if (lindex > -1 || findex > -1) {
        if (lindex > -1) delete computedFollowers[luid];
				if (findex > -1) delete computedFollowings[fuid];
        snackbarMsg = `Non segui più ${fuser.displayName}`;
      } else {
        computedFollowers = { 
          ...computedFollowers,
          [luid]: {
            displayName: user.displayName,
            photoURL: user.photoURL,
            timestamp
          }
        };
				computedFollowings = {
          ...computedFollowings,
          [fuid]: {
            displayName: fuser.displayName,
            photoURL: fuser.photoURL,
            timestamp
          }
        };
        snackbarMsg = `Segui ${fuser.displayName}`;
        const followerName = user.displayName.split(' ')[0];
        followerDisplayName = truncateString(followerName, 12);
        noteMsg = `<a href="/dashboard/${luid}">${followerDisplayName}</a> ha iniziato a seguirti`;
			}
      // console.log({ computedFollowers, computedFollowings });
	
			// VISITED
			followersRef(fuid).set(computedFollowers).then(() => {
        // Send notification to the followed user    
        if (noteMsg) {
          const newNoteRef = notesRef(fuid).doc();
          newNoteRef.set({
            nid: newNoteRef.id,
            text: noteMsg,
            created_num: timestamp,
            createdBy: user.displayName,
            createdByUid: luid,
            photoURL: user.photoURL,
            tag: ['follow'],
            read: false,
            uid: fuid
          }).catch(err => console.warn(err));
        }
        // VISITOR
        followingsRef(luid).set(computedFollowings).then(() => {
          openSnackbar(snackbarMsg, 'success');
        }).catch(err => console.warn(`Followings error: ${err}`)); 
      }).catch(err => console.warn(`Followers error: ${err}`));
    } else {
      openSnackbar('Utente non autenticato', 'error');
    }
  }, [duser, followers, followings, lfollowers, lfollowings, luid, openSnackbar, uid, user]);

  const historyPushTabIndex = useCallback(index => {
    const newPath = `/dashboard/${uid}/${tabs[index]}`;
    if (history !== newPath) {
      history.push(newPath, null);
    }
  }, [history, uid]);

  const onTabSelect = useCallback((e, value) => {
    if (value !== -1) {
      if (is.current) {
        setTabSelected(value);
        historyPushTabIndex(value);
      }
    }
  }, [historyPushTabIndex]);

  const onTabSelectIndex = useCallback((index, /* indexLatest, meta */) => {
    if (index !== -1) {
      if (is.current) {
        setTabSelected(index);
        historyPushTabIndex(index);
      }
    }
  }, [historyPushTabIndex]);

  const challengeBooks = useMemo(() => challenges && challenges.length && challenges.filter(challenge => challenge.completed_num !== challenge.books.length)[0].books, [challenges]);
  const challengeBooks_num = useMemo(() => challengeBooks && Object.keys(challengeBooks).length, [challengeBooks]);
  const challengeReadBooks_num = useMemo(() => challengeBooks && Object.keys(challengeBooks).filter(book => challengeBooks[book] === true).length, [challengeBooks]);
  const challengeProgress = useMemo(() => challengeBooks_num && challengeReadBooks_num ? Math.round(100 / challengeBooks_num * challengeReadBooks_num) : 0, [challengeBooks_num, challengeReadBooks_num]);
  const challengeCompleted = useMemo(() => challengeProgress === 100, [challengeProgress]);
  const isMini = useMemo(() => isTouchDevice() || _screenSize === 'sm' || _screenSize === 'xs', [_screenSize]);
  const contactsSkeleton = useMemo(() => [...Array(3)].map((e, i) => <div key={i} className="avatar-row skltn" />), []);
  const creationYear = useMemo(() => duser && String(new Date(duser.creationTime).getFullYear()), [duser]);
  const Roles = useMemo(() => duser && Object.keys(duser.roles).map((role, i) => duser.roles[role] && (
    <div key={`${i}_${role}`} className={`badge ${role}`}>{role}</div>
  )), [duser]);

  if (!duser && !loading) return <NoMatch title="Dashboard utente non trovata" history={history} location={location} />
  
  const usersList = obj => (
    <>
      {Object.keys(obj).map(f => (
        <div key={f} className="avatar-row">
          <Link to={`/dashboard/${f}`} className="row ripple">
            <div className="col">
              <Avatar className="avatar" src={obj[f].photoURL} alt={obj[f].displayName}>{!obj[f].photoURL && getInitials(obj[f].displayName)}</Avatar>{obj[f].displayName}
            </div>
            {!isMini && 
              <div className="col-auto">
                <div className="timestamp hide-on-hover">{timeSince(obj[f].timestamp)}</div>
                {isOwner && f !== luid && 
                  <button type="button" className="btn flat show-on-hover" onClick={e => onFollowUser(e, f, obj[f])}>
                    {obj === followers ? 'Segui' : 'Non seguire'}
                  </button>
                }
              </div>
            }
          </Link>
        </div> 
      ))}
      {/* <PaginationControls // TODO
        count={obj === followers ? followersCount : followingsCount} 
        fetch={obj === followers ? fetchFollowers : fetchFollowings} 
        limit={4}
        loading={obj === followers ? followersLoading : followingsLoading}
        oneWay
        page={obj === followers ? followersPage : followingsPage}
      /> */}
    </>
  );

  const ShelfDetails = () => (
    <div className="info-row footer centered shelfdetails">
      <span className="counter">{icon.book} <b>{duser ? duser.stats.shelf_num : 0}</b> <span className="hide-sm">Libri</span></span>
      <span className="counter">{icon.heart} <b>{duser ? duser.stats.wishlist_num : 0}</b> <span className="hide-sm">Desideri</span></span>
      <span className="counter">{icon.star} <b>{duser ? duser.stats.ratings_num : 0}</b> <span className="hide-sm">Valutazioni</span></span>
      <span className="counter">{icon.messageText} <b>{duser ? duser.stats.reviews_num : 0}</b> <span className="hide-sm">Recensioni</span></span>
    </div>
  );

  const EmptyRow = () => (
    <div className="avatar-row empty">
      <div className="row">
        <div className="col"><Avatar className="avatar">{icon.accountOff}</Avatar> Nessuno</div>
      </div>
    </div>
  );

  const TabLabel = (icon, label) => (
    <>
      <span className="icon show-md">{icon}</span>
      <span className="label">{label}</span>
    </>
  );

  const tabSeoTitle = () => {
    switch (tabSelected) {
      case 0: return 'La libreria';
      case 1: return 'La lista dei desideri';
      case 2: return 'Le attività';
      case 3: return 'I contatti';
      default: return 'La dashboard';
    }
  };

  return (
    <div className="container" id="dashboardComponent" ref={is}>
      <Helmet>
        <title>{app.name} | {duser ? `${tabSeoTitle()} di ${duser.displayName}` : 'Dashboard utente'}</title>
        <link rel="canonical" href={app.url} />
        <meta name="description" content={app.desc} />
        {tabSelected && duser && <link rel="canonical" href={`${app.url}/dashboard/${duser.uid}/shelf`} />}
      </Helmet>
      <div className="row">
        <div className="col-md col-12">
          <div className="card dark basic-profile-card">
            <div className="basic-profile">
                {duser && (
                  <Tooltip title="Ruolo utente" placement="left">
                    <div className="role-badges">{Roles} {!duser.roles.editor && <div className="badge red">Utente bloccato</div>}</div>
                  </Tooltip>
                )}
                <div className="row">
                  <div className="col-auto">
                    <Avatar className="avatar" /* src={duser.photoURL} */ alt={duser ? duser.displayName : 'Avatar'}>
                      {!loading ? duser.photoURL ? 
                        <ImageZoom
                          defaultStyles={imageZoomDefaultStyles}
                          image={{ src: duser.photoURL, className: 'thumb' }}
                          zoomImage={{ className: 'magnified avatar' }}
                        />
                      : getInitials(duser.displayName) : ''}
                    </Avatar>
                  </div>
                  <div className="col">
                    <h2 className="username">{loading ? <span className="skltn area" /> : duser.displayName}</h2>
                    {!loading ? (
                      <>
                        <div className="info-row hide-xs">
                          {duser.sex && duser.sex !== 'x' && <span className="counter">{duser.sex === 'm' ? 'Uomo' : duser.sex === 'f' ? 'Donna' : ''}</span>}
                          {duser.birth_date && <span className="counter">{calcAge(duser.birth_date)} anni</span>}
                          <span className="counter comma strict">
                            {duser.city && <span className="counter">{duser.city}</span>}
                            {duser.country && <span className="counter">{duser.country}</span>}
                            {duser.continent && <span className="counter">{duser.continent}</span>}
                          </span>
                          {duser.languages && <span className="counter">Parl{isOwner ? 'i' : 'a'} {joinToLowerCase(duser.languages)}</span>}
                          {creationYear && <span className="counter">Su {app.name} dal <b>{creationYear}</b></span>}
                          {isOwner && progress === 100 && <Link to="/profile"><button type="button" className="btn sm rounded flat counter">{icon.pencil} Modifica</button></Link>}
                        </div>
                        <div className="info-row">
                          {!isOwner && isAuthenticated() && (
                            <button 
                              type="button"
                              className={`btn sm ${follow ? 'success error-on-hover' : 'primary'}`} 
                              // disabled={!isAuthenticated()}
                              onClick={onFollowUser}>
                              {follow ? (
                                <>
                                  <span className="hide-on-hover">{icon.check} Segui</span>
                                  <span className="show-on-hover">Smetti</span>
                                </> 
                              ) : ( 
                                <span>{icon.plus} Segui</span>
                              )}
                            </button>
                          )}
                          <span className="counter"><b>{Object.keys(followers).length}</b> <span className="light-text">follower</span></span>
                          {screenSize !== 'sm' && <span className="counter"><b>{Object.keys(followings).length}</b> <span className="light-text">following</span></span>}
                        </div>
                      </>
                    ) : (
                      <div className="skltn three rows" style={skltnStyle} />
                    )}
                  </div>
                </div>

            </div>
          </div>
        </div>
        {isOwner && (
          <div className="col-lg-2 col-md-3 col-12 hide-md flex">
            <div className="card dark pad-v-sm text-center flex align-items-center">
              <div className="container">
                <div className="progress-container">
                  <div className="progress-base" />
                  <CircularProgress variant="static" value={progress < 100 ? progress : !challengeCompleted ? challengeProgress : 0} size={60} max={100} thickness={3} />
                  <div className="progress-value">{progress < 100 ? `${progress}%` : challengeBooks && !challengeCompleted ? `${challengeProgress}%` : icon.reader}</div>
                </div>
                <div className="info-row">
                  <div className="counter last font-sm ligth-text">{progress < 100 ? 'Progresso profilo' : challengeBooks && !challengeCompleted ? `${challengeReadBooks_num} di ${challengeBooks_num} libri` : 'Nessuna sfida'}</div>
                  <Link to={progress < 100 ? '/profile' : challengeBooks && !challengeCompleted ? '/challenge' : '/challenges'} className="btn sm primary rounded">{progress < 100 ? 'Completa' : challengeBooks && !challengeCompleted ? 'Vedi sfida' : 'Scegli sfida'}</Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <AppBar position="static" className="appbar toppend mobile">
        <Tabs 
          // tabItemContainerStyle={{borderTopLeftRadius: 4, borderTopRightRadius: 4}}
          value={tabSelected}
          onChange={onTabSelect}
          variant="fullWidth"
          // variant="scrollable"
          scrollButtons="auto">
          <Tab label={TabLabel(icon.book, 'Libreria')} />
          <Tab label={TabLabel(icon.heart, 'Desideri')} />
          <Tab label={TabLabel(icon.poll, 'Attività')} />
          <Tab label={TabLabel(icon.account, 'Contatti')} />
        </Tabs>
      </AppBar>
      <BindKeyboardSwipeableViews 
        enableMouseEvents
        resistance
        className="card light tabs-container bottompend mobile"
        axis="x"
        index={tabSelected}
        onChangeIndex={onTabSelectIndex}>
        <div className="card tab" dir={tabDir}>
          {tabSelected === 0 && uid && <Shelf uid={uid} shelf="bookInShelf" />}
        </div>
        <div className="card tab" dir={tabDir}>
          {tabSelected === 1 && uid && <Shelf uid={uid} shelf="bookInWishlist" />}
        </div>
        <div className="card tab" dir={tabDir}>
          {tabSelected === 2 && uid && <Reviews uid={uid} limit={3} container={false} pagination skeleton />}
        </div>
        <div className="card tab contacts-tab" dir={tabDir}>
          {tabSelected === 3 && (
            <div className="row">
              <div className="col-md-6 cols-12 contacts-tab-col">
                <h4>Seguito da:</h4>
                {loading ? contactsSkeleton : Object.keys(followers).length ? usersList(followers) : <EmptyRow />}
              </div>
              <div className="col-md-6 col-12 contacts-tab-col">
                <h4>Segue:</h4>
                {loading ? contactsSkeleton : Object.keys(followings).length ? usersList(followings) : <EmptyRow />}
              </div>
            </div>
          )}
        </div>
      </BindKeyboardSwipeableViews>
      <ShelfDetails />
    </div>
  );
}

Dashboard.propTypes = {
  history: historyType,
  location: locationType,
  match: matchType
}

Dashboard.defaultProps = {
  history: null,
  location: null,
  match: null
}
 
export default Dashboard;