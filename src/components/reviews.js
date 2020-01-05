import CircularProgress from '@material-ui/core/CircularProgress';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import UserContext from '../context/userContext';
import { isAuthenticated, reviewersGroupRef, reviewersRef } from '../config/firebase';
import { handleFirestoreError } from '../config/shared';
import { boolType, funcType, numberType, stringType } from '../config/types';
import PaginationControls from './paginationControls';
import Review from './review';

const desc = true;

const Reviews = props => {
  const { user } = useContext(UserContext);
  const { bid, container, limit, openSnackbar, pagination, skeleton, uid } = props;
  const [items, setItems] = useState(null);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [lastVisible, setLastVisible] = useState(null);
  const is = useRef(true);

  const fetch = useCallback(() => {
    const ref = bid ? reviewersRef(bid) : uid ? reviewersGroupRef.where('createdByUid', '==', uid) : reviewersGroupRef;
  
    ref.onSnapshot(fullSnap => { // TODO: remove fullSnap
      // console.log(fullSnap);
      if (!fullSnap.empty) {
        if (is.current) setCount(fullSnap.size);

        ref.orderBy('created_num', desc ? 'desc' : 'asc').limit(limit).get().then(snap => {
          const items = [];
          if (!snap.empty) {
            snap.forEach(item => items.push(item.data()));
            if (is.current) {
              setItems(items);
              setLoading(false);
              setLastVisible(snap.docs[snap.docs.length-1]);
            }
          }
        }).catch(err => {
          if (is.current) {
            setLoading(false);
            openSnackbar(handleFirestoreError(err), 'error');
          }
        });
      } else if (is.current) {
        setLoading(false);
      }
    });
  }, [bid, limit, openSnackbar, uid]);

  const fetchNext = useCallback(() => {
    const ref = bid ? reviewersRef(bid) : uid ? reviewersGroupRef.where('createdByUid', '==', uid) : reviewersGroupRef;

    if (is.current) setLoading(true);
		ref.orderBy('created_num', desc ? 'desc' : 'asc').startAfter(lastVisible).limit(limit).get().then(nextSnap => {
      if (!nextSnap.empty) {
        nextSnap.forEach(item => items.push(item.data()));
        if (is.current) {
          setItems(items);
          setLoading(false);
          setPage((page * limit) > count ? page : page + 1);
          setLastVisible(nextSnap.docs[nextSnap.docs.length-1] || lastVisible);
        }
      } else if (is.current) {
        setItems(null);
        setLoading(false);
        setPage(null);
        setLastVisible(null);
      }
		}).catch(err => {
      if (is.current) setLoading(false);
      openSnackbar(handleFirestoreError(err), 'error');
    });
  }, [bid, count, items, lastVisible, limit, openSnackbar, page, uid]);

  useEffect(() => {
    fetch(bid, uid);
  }, [bid, fetch, uid]);

  useEffect(() => () => {
    is.current = false;
  }, []);

  const skeletons = [...Array(limit)].map((e, i) => <div key={i} className="skltn review" />);
  
  if (loading && !items && !skeleton) {
    return <div aria-hidden="true" className="loader relative"><CircularProgress /></div>;
  }

  const EmptyState = () => (
    <div className="info-row empty text-center">
      Nessuna recensione<span className="hide-xs"> trovata</span>{!isAuthenticated() && !uid && <span>. <Link to="/login">Accedi</Link> o <Link to="/signup">registrati</Link> per aggiungerne una.</span>}
    </div>
  );

  return (
    <>
      <div className={`reviews ${container ? 'card dark' : ''}`} ref={is}>
        {!loading && !items ? <EmptyState /> :
          <>
            <div className="head">
              {!bid && <h2>Ultime recensioni<span className="counter">({items ? items.length : limit} di {count || limit})</span></h2>}
            </div>
            {items && items.map(item => (
              <Review 
                key={`${item.bid || 'nobid'}_${item.createdByUid}`}
                bid={bid}
                openSnackbar={openSnackbar}
                uid={uid}
                user={user}
                review={{
                  bid: item.bid || '',
                  photoURL: item.photoURL || '',
                  displayName: item.displayName || '',
                  bookTitle: item.bookTitle,
                  covers: item.covers || [],
                  createdByUid: item.createdByUid || '',
                  created_num: item.created_num || 0,
                  flag: item.flag,
                  dislikes: item.dislikes || {},
                  likes: item.likes || {},
                  rating_num: item.rating_num || 0,
                  text: item.text || '',
                  title: item.title || '',
                }} 
              />
            ))}
            {loading && skeleton && skeletons}
          </>
        }
      </div>
      {pagination && count > 0 && items && items.length < count &&
        <PaginationControls 
          count={count} 
          fetch={fetchNext} 
          limit={limit}
          loading={loading}
          oneWay
          page={page}
        />
      }
    </>
  );
}

Reviews.propTypes = {
  bid: stringType,
  container: boolType,
  limit: numberType,
  openSnackbar: funcType.isRequired,
  pagination: boolType,
  skeleton: boolType,
  uid: stringType
}

Reviews.defaultProps = {
  bid: null,
  container: true,
  limit: 5,
  pagination: true,
  skeleton: false,
  uid: null
}
 
export default Reviews;