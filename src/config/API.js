const booksAPIKey = 'AIzaSyC_TUnwRz_l4fIo7VpGjKzgPgyMfJ4GG_U';
const booksAPI = 'https://www.googleapis.com/books/v1';

export const booksAPIRef = ({q, intitle, inauthor, inpublisher, isbn, maxResults, startIndex} = {}) => `${booksAPI}/volumes?q=${q}${intitle ? `+intitle:${intitle}` : ''}${inauthor ? `+inauthor:${inauthor}` : ''}${inpublisher ? `+inpublisher:${inpublisher}` : ''}${isbn ? `+isbn:${isbn}` : ''}&langRestrict=it&printType=books&key=${booksAPIKey}&maxResults=${maxResults || 30}${startIndex ? `&startIndex=${startIndex}` : ''}`; 
// EXAMPLE: booksAPIRef({q: 'red', intitle: 'sherlock'});