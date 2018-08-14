import CircularProgress from '@material-ui/core/CircularProgress';
import React from 'react';
import Link from 'react-router-dom/Link';
import { booksRef } from '../../config/firebase';
import { icon } from '../../config/icons';
import Cover from '../cover';
import Genres from '../genres';

export default class Genre extends React.Component {
  state = {
    books: null,
    coverview: false,
    limit: 16,
    loading: true
  }

  componentDidMount() {
    this._isMounted = true;
    this.fetch();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidUpdate(prevProps, prevState) {
    if (this._isMounted) {
      if(this.props.match.params.gid !== prevProps.match.params.gid){
        this.fetch();
      }
    }
  }

  fetch = () => {
    if (this.props.match.params.gid) {
      booksRef.where('genres', 'array-contains', this.props.match.params.gid).limit(this.state.limit).get().then(snap => {
        if (!snap.empty) {
          const books = [];
          snap.forEach(book => books.push(book.data()));
          //console.log(books);
          this.setState({ books, loading: false });
        } else {
          this.setState({ books: null, loading: false });
        }
      }).catch(error => console.warn("Error fetching genres' books:", error));
    } else console.warn(`No gid`);
  }
  
  onToggleView = () => this.setState(prevState => ({ coverview: !prevState.coverview }));

  render() {
    const { books, coverview, loading } = this.state;

    const covers = books && books.map(book => <Link key={book.bid} to={`/book/${book.bid}`}><Cover book={book} /></Link>);

    if (loading) return <div className="loader"><CircularProgress /></div>

    return (
      <div className="container" id="genreComponent">
        <div className="card dark">
          <h2 className="title"><span className="primary-text">Genere:</span> {this.props.match.params.gid}</h2>
          <Genres />
        </div>

        {books ? 
          <div className="card">
            <div className="shelf">
              <div className="collection hoverable-items">
                <div className="head nav">
                  <div className="row">
                    <div className="col">
                      <button 
                        className="btn sm flat counter"
                        title={coverview ? 'Stack view' : 'Cover view'} 
                        onClick={this.onToggleView}>
                        {coverview ? icon.viewSequential() : icon.viewGrid()}
                      </button>
                      <span className="counter">{books.length || 0} libr{books.length === 1 ? 'o' : 'i'}</span>
                    </div>
                  </div>
                </div>
                <div className={`shelf-row books-per-row-4 ${coverview ? 'coverview' : 'stacked'}`}>
                  {covers}
                </div>
              </div>
            </div>
          </div>
        :
          <div className="info-row empty text-center pad-v">
            <p>Non ci sono ancora libri di questo genere</p>
            <Link to="/new-book" className="btn primary">Aggiungi libro</Link>
          </div>
        }

      </div>
    );
  }
};