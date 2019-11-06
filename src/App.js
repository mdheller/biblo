import CircularProgress from '@material-ui/core/CircularProgress';
import { ThemeProvider } from '@material-ui/styles';
import PropTypes from 'prop-types';
import React, { lazy, Suspense, useEffect, useState } from 'react';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { Redirect, Route, Switch } from 'react-router-dom';
import ErrorBoundary from './components/errorBoundary';
import PasswordResetForm from './components/forms/passwordResetForm';
import Layout from './components/layout';
import NewFeature from './components/newFeature';
import AboutPage from './components/pages/aboutPage';
import AddBook from './components/pages/addBook';
import AuthorPage from './components/pages/authorPage';
import AuthorsPage from './components/pages/authorsPage';
import BookContainer from './components/pages/bookContainer';
import CookiePage from './components/pages/cookiePage';
import DonationsPage from './components/pages/donationsPage';
import Genre from './components/pages/genre';
import genresPage from './components/pages/genresPage';
import HelpPage from './components/pages/helpPage';
import Home from './components/pages/home';
import Login from './components/pages/login';
import NoMatchPage from './components/pages/noMatchPage';
import Notifications from './components/pages/notifications';
import PrivacyPage from './components/pages/privacyPage';
import Signup from './components/pages/signup';
import TermsPage from './components/pages/termsPage';
import VerifyEmailPage from './components/pages/verifyEmailPage';
import { auth, isAuthenticated, storageKey_uid, userRef } from './config/firebase';
import { app, handleFirestoreError, isLocalStorage, needsEmailVerification } from './config/shared';
import { defaultTheme } from './config/themes';
import { locationType } from './config/types';
import { SharedSnackbarConsumer, SharedSnackbarProvider } from './context/snackbarContext';

const Admin = lazy(() => import('./components/pages/admin/admin'));
const Challenge = lazy(() => import('./components/pages/challenge'));
// const Challenges = lazy(() => import('./components/pages/challenges'));
const Collection = lazy(() => import('./components/pages/collection'));
const Dashboard = lazy(() => import('./components/pages/dashboard'));
const IconsPage = lazy(() => import('./components/pages/iconsPage'));
const NewBook = lazy(() => import('./components/pages/newBook'));
const Profile = lazy(() => import('./components/pages/profile'));

const App = () => {
  const [state, setState] = useState({
    error: null,
		user: null
  });

  useEffect(() => {
    const clearUser = () => {
      setState(prevState => ({ ...prevState, user: null }));
      isLocalStorage() && localStorage.removeItem(storageKey_uid)
    }

    let unsubUserFetch;

    const setUser = user => {
      unsubUserFetch = userRef(user.uid).onSnapshot(snap => {
        // console.log(snap);
        if (snap.exists) {
          setState(prevState => ({ 
            ...prevState, 
            user: snap.data(), 
            error: null 
          }));
          isLocalStorage() && localStorage.setItem(storageKey_uid, user.uid);
        } else console.warn(`User not found in database`);
      }, err => {
        setState(prevState => ({ ...prevState, error: handleFirestoreError(err) }));
      });
    }

    auth.onIdTokenChanged(user => {
      if (user) {
        // console.log(user);
        if (needsEmailVerification(user)) clearUser();
        else setUser(user);
      } else clearUser();
    });

    return () => {
      unsubUserFetch && unsubUserFetch();
    }
  }, []);

  const { error, user } = state;
  
  return (
    <ThemeProvider theme={defaultTheme}>
      <HelmetProvider>
        <Helmet>
          <title>{app.name}</title>
          <meta property="og:title" content={app.name} />
          <meta property="og:url" content={app.url} />
          <meta property="og:image" content={`${app.url}/img/og-image.jpg`} />
          <meta property="og:description" content={app.desc} />
          <meta name="description" content={app.desc} />
        </Helmet>
        <SharedSnackbarProvider>
          <SharedSnackbarConsumer>
            {({ openSnackbar }) => (
              <Layout user={user} error={error} openSnackbar={openSnackbar}>
                <ErrorBoundary>
                  <Suspense fallback={<div aria-hidden="true" className="loader"><CircularProgress /></div>}>
                    <Switch>
                      <RouteWithProps path="/" exact component={Home} user={user} openSnackbar={openSnackbar} />
                      <Route path="/about" component={AboutPage} />
                      <Route path="/cookie" component={CookiePage} />
                      <Route path="/donations" component={DonationsPage} />
                      <Route path="/help" component={HelpPage} />
                      <Route path="/privacy" component={PrivacyPage} />
                      <Route path="/terms" component={TermsPage} />
                      <RouteWithProps path="/verify-email" component={VerifyEmailPage} user={user} openSnackbar={openSnackbar} />
                      <RouteWithProps path="/password-reset" component={PasswordResetForm} openSnackbar={openSnackbar} />
                      <RouteWithProps path="/login" component={Login} openSnackbar={openSnackbar} />
                      <RouteWithProps path="/signup" component={Signup} openSnackbar={openSnackbar} />
                      <RouteWithProps path="/author/:aid" component={AuthorPage} user={user} openSnackbar={openSnackbar} />
                      <RouteWithProps path="/genres" component={genresPage} openSnackbar={openSnackbar} />
                      <RouteWithProps path="/authors" component={AuthorsPage} user={user} openSnackbar={openSnackbar} />
                      <RouteWithProps path="/collection/:cid" component={Collection} user={user} openSnackbar={openSnackbar} />
                      <RouteWithProps path="/collections" component={NewFeature} user={user} openSnackbar={openSnackbar} />
                      <RouteWithProps path="/genre/:gid" component={Genre} user={user} openSnackbar={openSnackbar} />
                      <RouteWithProps path="/book/:bid" component={BookContainer} user={user} openSnackbar={openSnackbar} />
                      <RouteWithProps path="/dashboard/:uid" exact component={Dashboard} user={user} openSnackbar={openSnackbar} />
                      <RouteWithProps path="/dashboard/:uid/:tab" component={Dashboard} user={user} openSnackbar={openSnackbar} />
                      <RouteWithProps path="/icons" component={IconsPage} openSnackbar={openSnackbar} />
                      <PrivateRoute path="/books/add" component={AddBook} user={user} openSnackbar={openSnackbar} />
                      <PrivateRoute path="/new-book" component={NewBook} user={user} openSnackbar={openSnackbar} />
                      <PrivateRoute path="/notifications" component={Notifications} user={user} openSnackbar={openSnackbar} />
                      <PrivateRoute path="/profile" exact component={Profile} user={user} openSnackbar={openSnackbar}/>
                      <PrivateRoute path="/admin" exact component={Admin} user={user} openSnackbar={openSnackbar} />
                      <PrivateRoute path="/admin/:tab" component={Admin} user={user} openSnackbar={openSnackbar} />
                      <PrivateRoute path="/challenge" component={Challenge} user={user} openSnackbar={openSnackbar} />
                      <PrivateRoute path="/challenges" component={NewFeature} user={user} openSnackbar={openSnackbar} />
                      <Redirect from="/home" to="/" />
                      <Redirect from="/webmaster/*" to="/" />
                      <Redirect from="/chi-siamo" to="/about" />
                      <Redirect from="/aiuto" to="/help" />
                      <Route component={NoMatchPage} status={404} />
                    </Switch>
                  </Suspense>
                </ErrorBoundary>
              </Layout>
            )}
          </SharedSnackbarConsumer>
        </SharedSnackbarProvider>
      </HelmetProvider>
    </ThemeProvider>
  );
}
 
export default App;

const PrivateRoute = ({ component: Component, ...rest }) => (
	<Route {...rest} render={props => (
		isAuthenticated() ?
			<Component {...props} {...rest} />
		:
			<Redirect to={{ pathname: '/login', state: { from: props.location } }} />
	)} />
);

PrivateRoute.propTypes = {
  component: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.object
  ]).isRequired,
  location: locationType
}

PrivateRoute.defaultProps = {
  location: { pathname: '' },
};

const RouteWithProps = ({ path, exact, strict, component: Component, location, ...rest }) => (
  <Route
    path={path}
    exact={exact}
    strict={strict}
    location={location}
    render={props => <Component {...props} {...rest} />} 
	/>
);

RouteWithProps.propTypes = {
  component: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.object
  ]).isRequired,
  exact: PropTypes.bool,
  location: locationType,
  path: PropTypes.string.isRequired,
  strict: PropTypes.bool
};

RouteWithProps.defaultProps = {
  exact: false,
  location: { pathname: '' },
  strict: false
};