import React from 'react';
import SharedSnackbar from '../components/sharedSnackbar';

const SharedSnackbarContext = React.createContext();

export class SharedSnackbarProvider extends React.Component {
  state = {
    autoHideDuration: 5000,
    isOpen: false,
    message: '',
    variant: null
  };

  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  openSnackbar = (message, variant, autoHideDuration) => {
    if (this._isMounted) {
      this.setState({ message, isOpen: true, variant, autoHideDuration });
    }
  };

  closeSnackbar = () => {
    if (this._isMounted) {
      this.setState({ isOpen: false, autoHideDuration: 5000 });
    }
  };

  render() {
    const { autoHideDuration, isOpen, message, variant } = this.state;
    const { children } = this.props;

    return (
      <SharedSnackbarContext.Provider
        value={{
          openSnackbar: this.openSnackbar,
          closeSnackbar: this.closeSnackbar,
          snackbarIsOpen: isOpen,
          message,
          variant,
          autoHideDuration
        }}>
        <SharedSnackbar />
        {children}
      </SharedSnackbarContext.Provider>
    );
  }
}

export const SharedSnackbarConsumer = SharedSnackbarContext.Consumer;