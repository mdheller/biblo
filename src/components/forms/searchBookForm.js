import React from 'react';
import { AutoComplete/* , CircularProgress */ } from 'material-ui';
import { booksRef } from '../../config/firebase';

export default class SearchBookForm extends React.Component {
  constructor(props){
    super(props);
    this.state = {
      searchText: '',
      loading: false,
      options: []
    }
  }

  onUpdateInput = searchText => {
    clearTimeout(this.timer);
    this.setState({ searchText: searchText.normalize().toLowerCase() });
    this.timer = setTimeout(this.fetchOptions, 500);
  }

  fetchOptions = () => {
    const { searchText } = this.state;
    if (!searchText) return;
    this.setState({ loading: true });
    booksRef.where('title_sort', '>=', searchText).orderBy('title_sort').limit(5).onSnapshot(snap => {
      let books = [];
      snap.forEach(doc => {
        books.push(doc.data())
      });
      this.setState({
        loading: false,
        options: books
      });
    });
  }

  onNewRequest = chosenRequest => {
    this.setState({ loading: false });
    this.props.onBookSelect(chosenRequest);
  }

  onClose = () => this.setState({ loading: false });

  render() {
    return (
      <form ref="SearchBookFormComponent" className="container-sm">
        <div className="form-group">
          {/* this.state.loading && <div className="loader"><CircularProgress /></div> */}
          <AutoComplete
            name="search"
            floatingLabelText="Cerca un libro inserendo il titolo"
            hintText="Es: Sherlock Holmes"
            searchText={this.state.searchText}
            //filter={(searchText, key) => searchText !== '' && key.indexOf(searchText) !== -1}
            onUpdateInput={this.onUpdateInput}
            onNewRequest={this.onNewRequest}
            onClose={this.onClose}
            fullWidth={true}
            filter={AutoComplete.fuzzyFilter}
            maxSearchResults={5}
            dataSource={this.state.options}
            dataSourceConfig={{text: 'title', value: 'bid'}}
          />
        </div>
      </form>
    )
  }
}