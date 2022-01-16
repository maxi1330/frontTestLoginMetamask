import * as React from 'react';
import Web3 from 'web3';

import { Auth } from '../types';
import './Login.css';

interface Props {
  onLoggedIn: (auth: Auth) => void;
}

let web3: Web3 | undefined = undefined; // Will hold the web3 instance

export class Login extends React.Component<Props> {
  state = {
    loading: false // Loading button state
  };

  handleAuthenticate = ({
    ethAddress,
    signature
  }: {
    ethAddress: string;
    signature: string;
  }) =>
    fetch(`${process.env.REACT_APP_BACKEND_URL}/auth`, {
      body: JSON.stringify({ ethAddress, signature }),
      headers: {
        'Content-Type': 'application/json'
      },
      method: 'POST'
    }).then(response => response.json());

  handleClick = async () => {
    const { onLoggedIn } = this.props;

    // Check if MetaMask is installed
    if (!(window as any).ethereum) {
      window.alert('Please install MetaMask first.');
      return;
    }

    if (!web3) {
      try {
        // Request account access if needed
        await (window as any).ethereum.enable();

        // We don't know window.web3 version, so we use our own instance of Web3
        // with the injected provider given by MetaMask
        web3 = new Web3((window as any).ethereum);
      } catch (error) {
        window.alert('You need to allow MetaMask.');
        return;
      }
    }

    const coinbase = await web3.eth.getCoinbase();
    if (!coinbase) {
      window.alert('Please activate MetaMask first.');
      return;
    }

    const ethAddress = coinbase.toLowerCase();
    this.setState({ loading: true });

    // Look if user with current publicAddress is already present on backend
    fetch(
      `${
        process.env.REACT_APP_BACKEND_URL
      }/users?ethAddress=${ethAddress}`
    )
      .then(response => response.json())
      // If yes, retrieve it. If no, create it.
      .then(users =>
        users.length ? users[0] : this.handleSignup(ethAddress)
      )
      // Popup MetaMask confirmation modal to sign message
      .then(this.handleSignMessage)
      // Send signature to backend on the /auth route
      .then(this.handleAuthenticate)
      // Pass accessToken back to parent component (to save it in localStorage)
      .then(onLoggedIn)
      .catch(err => {
        window.alert(err);
        this.setState({ loading: false });
      });
  };

  handleSignMessage = async ({
    ethAddress,
    nonce
  }: {
    ethAddress: string;
    nonce: string;
  }) => {
    try {
      const signature = await web3!.eth.personal.sign(
        `Estás firmando para ingresar a The Voice: ${nonce}`,
        ethAddress,
        '' // MetaMask will ignore the password argument here
      );
      return { ethAddress, signature };
    } catch (err) {
      throw new Error('You need to sign the message to be able to log in.');
    }
  };

  handleSignup = (ethAddress: string) => {
    return fetch(`${process.env.REACT_APP_BACKEND_URL}/users`, {
      body: JSON.stringify({ ethAddress }),
      headers: {
        'Content-Type': 'application/json'
      },
      method: 'POST'
    }).then(response => response.json());
  };

  render() {
    const { loading } = this.state;
    return (
      <div>
        <p>
          Please select your login method.
          <br />
          For the purpose of this demo, only MetaMask login is implemented.
        </p>
        <button className="Login-button Login-mm" onClick={this.handleClick}>
          {loading ? 'Loading...' : 'Login with MetaMask'}
        </button>
        <button className="Login-button Login-fb" disabled>
          Login with Facebook
        </button>
        <button className="Login-button Login-email" disabled>
          Login with Email
        </button>
      </div>
    );
  }
}
