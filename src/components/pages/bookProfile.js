import CircularProgress from '@material-ui/core/CircularProgress';
import React from 'react';
import Rater from 'react-rater';
import Link from 'react-router-dom/Link';
import { isAuthenticated } from '../../config/firebase';
import { icon } from '../../config/icons';
import { calcReadingTime, joinObj, timeSince } from '../../config/shared';
import { funcType, userBookType, userType } from '../../config/types';
import Cover from '../cover';
import Incipit from '../incipit';
import Rating from '../rating';
import ReadingStateForm from '../forms/readingStateForm';
import Reviews from '../reviews';
import UserReview from '../userReview';
import CopyToClipboard from '../copyToClipboard';

export default class BookProfile extends React.Component {
	state = {
    book: {
      ...this.props.book,
      bid: (this.props.book && this.props.book.bid) || ''
    },
    user: this.props.user || {},
    userBook: this.props.userBook,
    errors: {},
    isReadingStateOpen: false,
    isIncipitOpen: false,
    isDescMinified: false,
    prevProps: this.props
  }

  static propTypes = {
    addBookToShelf: funcType.isRequired,
    addBookToWishlist: funcType.isRequired,
    removeBookFromShelf: funcType.isRequired,
    removeBookFromWishlist: funcType.isRequired,
    rateBook: funcType.isRequired,
    isEditing: funcType.isRequired,
    user: userType,
    userBook: userBookType
  }

  static getDerivedStateFromProps(props, state) {
    if (props.book !== state.book) { return { book: props.book }}
    if (props.user !== state.user) { return { user: props.user }}
    if (state.prevProps !== props) {
      if (props.userBook !== state.userBook) { return { prevProps: props, userBook: props.userBook }}
    }
    return null;
  }

  componentDidMount() {
    if (!this.props.loading) {
      this.minifyDescription();
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if(!this.props.loading && this.state.book.description.length !== prevState.book.description.length){
      this.minifyDescription();
    }
  }

  minifyDescription = () => {
    this.setState({ isDescMinified: this.state.book.description.length > 700 ? true : false });
  }

  onAddBookToShelf = () => {
    this.props.addBookToShelf(this.state.book.bid);
  }

  onAddBookToWishlist = () => {
    this.props.addBookToWishlist(this.state.book.bid);
  }

  onRemoveBookFromShelf = () => {
    this.props.removeBookFromShelf(this.state.book.bid);
  }

  onRemoveBookFromWishlist = () => {
    this.props.removeBookFromWishlist(this.state.book.bid);
  }

  onRateBook = rate => {
    if(rate.type === 'click') {
      this.props.rateBook(this.state.book.bid, rate.rating);
      this.setState({
        userBook: {
          ...this.state.userBook,
          rating_num: rate.rating
        }
      });
    }
  }

  onMinify = () => {
    this.setState(prevState => ({ isDescMinified: !prevState.isDescMinified })); 
  }

  onToggleIncipit = () => {
    this.setState(prevState => ({ isIncipitOpen: !prevState.isIncipitOpen })); 
  }

  onEditing = () => this.props.isEditing();

  onToggleReadingState = () => {
    this.setState(prevState => ({ isReadingStateOpen: !prevState.isReadingStateOpen })); 
  }
  
	render() {
    const { book, isIncipitOpen, isDescMinified, isReadingStateOpen, user, userBook } = this.state;
    const { loading } = this.props;
    //const isAdmin = () => user && user.roles && user.roles.admin === true;
    const isEditor = () => user && user.roles && user.roles.editor === true;
    const hasBid = () => book && book.bid;

    if (loading) return <div className="loader"><CircularProgress /></div>

		return (
      <React.Fragment>
        {isIncipitOpen && <Incipit title={book.title} incipit={book.incipit} onToggle={this.onToggleIncipit} />}
      
        <div id="BookProfileComponent">
          <div className="content-background"><div className="bg" style={{backgroundImage: `url(${book.covers[0]})`}}></div></div>

          {isReadingStateOpen && <ReadingStateForm bid={book.bid} readingState={userBook.readingState} onToggle={this.onToggleReadingState} />}

          <div className="container top">
            <div className="card main text-align-center-md">
              <div className="row">
                <div className="col-md-auto col-sm-12" style={{marginBottom: 15}}>
                  {book.incipit ? 
                    <div role="button" className="hoverable-items" onClick={this.onToggleIncipit}>
                      <Cover book={book} rating={false} info={false} />
                    </div>
                  :
                    <Cover book={book} rating={false} info={false} />
                  }
                </div>
                <div className="col book-profile">
                  <h2 className="title">{book.title}</h2>
                  {book.subtitle && <h3 className="subtitle">{book.subtitle}</h3>}
                  <div className="info-row">
                    {book.authors && <span className="counter">di {joinObj(book.authors)}</span>}
                    {book.publisher && <span className="counter hide-sm">editore: {book.publisher}</span>}
                    {isAuthenticated() && isEditor() && book.bid && <button className="btn sm flat counter" onClick={this.onEditing}>{icon.pencil()} Modifica</button>}
                  </div>
                  <div className="info-row hide-sm">
                    <span className="counter">ISBN-13: <CopyToClipboard text={book.ISBN_13}/></span>
                    {(book.ISBN_10 !== 0) && <span className="counter">ISBN-10: <CopyToClipboard text={book.ISBN_10}/></span>}
                    {book.publication && <span className="counter">Pubblicazione: {new Date(book.publication).toLocaleDateString()}</span>}
                    {/* (book.edition_num !== 0) && <span className="counter">Edizione: {book.edition_num}</span> */}
                    {(book.pages_num !== 0) && <span className="counter">Pagine: {book.pages_num}</span>}
                    {/* book.format && <span className="counter">Formato: {book.format}</span> */}
                    {book.genres && book.genres[0] && <span className="counter">Gener{book.genres[1] ? 'i' : 'e'}: {book.genres.join(", ")}</span>}
                  </div>

                  <div className="info-row">
                    <Rating labels={true} ratings={{ratings_num: book.ratings_num, rating_num: book.rating_num}}/>
                  </div>

                  {isAuthenticated() &&
                    <React.Fragment>
                      <div className="info-row">
                        {userBook.bookInShelf ? 
                          <React.Fragment>
                            <button className="btn success error-on-hover" onClick={this.onRemoveBookFromShelf}>
                              <span className="hide-on-hover">Aggiunto a libreria</span>
                              <span className="show-on-hover">Rimuovi da libreria</span>
                            </button>
                            <button className="btn" onClick={this.onToggleReadingState}>Stato lettura</button>
                          </React.Fragment>
                        :
                          <button className="btn primary" disabled={!hasBid()} onClick={this.onAddBookToShelf}>Aggiungi a libreria</button>
                        }
                        {userBook.bookInWishlist && 
                          <button className="btn success error-on-hover" onClick={this.onRemoveBookFromWishlist}>
                            <span className="hide-on-hover">Aggiunto a desideri</span>
                            <span className="show-on-hover">Rimuovi da desideri</span>
                          </button>
                        }
                        {(!userBook.bookInWishlist && !userBook.bookInShelf) &&
                          <button className="btn flat" disabled={!hasBid()} onClick={this.onAddBookToWishlist}>Aggiungi a desideri</button>
                        }
                      </div>
                      <div className="info-row">
                        {userBook.bookInShelf &&
                          <div className="user rating">
                            <Rater total={5} onRate={rate => this.onRateBook(rate)} rating={userBook.rating_num || 0} />
                            {/* <span className="rating-num">{userBook.rating_num || 0}</span> */}
                            <span className="label">Il tuo voto</span>
                          </div>
                        }
                      </div>
                    </React.Fragment>
                  }

                  {book.description && 
                    <div className="info-row">
                      <p className={`description ${isDescMinified ? 'minified' : 'expanded'}`}>{book.description || ''}</p>
                      {isDescMinified && <p><button className="link" onClick={this.onMinify}>Mostra tutto</button></p>}
                    </div>
                  }
                  <div>&nbsp;</div>
                  <div className="info-row">
                    <span className="counter">Lettori: {book.readers_num}</span>
                    {book.pages_num && <span className="counter">Lettura: {calcReadingTime(book.pages_num)}</span>}
                    <span className="counter">Recensioni: {book.reviews_num}</span>
                  </div>
                </div>
                {book.EDIT &&
                  <div className="edit-info">
                    {icon.informationOutline()}
                    <div className="show-on-hover">
                      {book.EDIT.lastEdit_num ? 
                        <span>Modificato da <Link to={`/dashboard/${book.EDIT.lastEditByUid}`}>{book.EDIT.lastEditBy}</Link> {timeSince(new Date(book.EDIT.lastEdit_num))}</span> 
                      : 
                        <span>Creato da <Link to={`/dashboard/${book.EDIT.createdByUid}`}>{book.EDIT.createdBy}</Link> {timeSince(new Date(book.EDIT.created_num))}</span>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>

            {book.bid &&
              <React.Fragment>
                {isAuthenticated() && isEditor() && userBook.bookInShelf &&
                  <UserReview bid={book.bid} bookReviews_num={book.reviews_num} user={user} userBook={userBook} /> 
                }

                <Reviews bid={book.bid} />
              </React.Fragment>
            }

          </div>
        </div>
      </React.Fragment>
		);
	}
}