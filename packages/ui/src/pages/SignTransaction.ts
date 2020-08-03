import { FunctionalComponent } from "preact";
import { html } from 'htm/preact';
import { useState, useEffect, useContext } from 'preact/hooks';

import { JsonRpcMethod } from '@algosigner/common/messaging/types';

import TxAcfg from 'components/SignTransaction/TxAcfg'
import TxPay from 'components/SignTransaction/TxPay'
import TxKeyreg from 'components/SignTransaction/TxKeyreg'
import TxAxfer from 'components/SignTransaction/TxAxfer'
import TxAfrz from 'components/SignTransaction/TxAfrz'
import Authenticate from 'components/Authenticate'
import { sendMessage } from 'services/Messaging'
import { StoreContext } from 'index'
import logotype from 'assets/logotype.png'

function deny() {
  sendMessage(JsonRpcMethod.SignDeny, {}, function() {});
}

const SignTransaction: FunctionalComponent = (props) => {
  const store:any = useContext(StoreContext);
  const [askAuth, setAskAuth] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [account, setAccount] = useState<string>('');
  const [request, setRequest] = useState<any>({});
  const [showTx, setShowTx] = useState<any>(null);

  useEffect(() => {
    chrome.runtime.onMessage.addListener((request,sender,sendResponse) => {
      if(request.body.method == JsonRpcMethod.SignTransaction)
        setRequest(request);
    });

    window.addEventListener("beforeunload", deny);
    return () => window.removeEventListener("beforeunload", deny);
  }, []);


  const sign = (pwd: string) => {
    const params = {
      passphrase: pwd,
    };
    setLoading(true);
    setAuthError('');
    setError('');
    window.removeEventListener("beforeunload", deny);


    sendMessage(JsonRpcMethod.SignAllow, params, function(response) {
      if ('error' in response) { 
        window.addEventListener("beforeunload", deny);
        setLoading(false);
        switch (response.error) {
          case "Login Failed":
            setAuthError('Wrong passphrase');
            break;
          default:
            setError(response.error);
            setAskAuth(false);
            break;
        }
      }
    });
  }

  if (request.body) {
    let tx = request.body.params;
    console.log('TX', tx)
    // Search for account
    let ledger;
    if (tx.genesisID === "mainnet-v1.0")
      ledger = 'MainNet';
    else if (tx.genesisID === "testnet-v1.0")
      ledger = 'TestNet';

    for (var i = store[ledger].length - 1; i >= 0; i--) {
      if (store[ledger][i].address === tx.from){
        setAccount(store[ledger][i].name);
        break;
      }
    }
  }

  return html`
    <div class="main-view" style="flex-direction: column; justify-content: space-between;">
      <div class="px-4 mt-2" style="flex: 0; border-bottom: 1px solid #EFF4F7">
        <img src=${logotype} width="130" />
      </div>
      <div style="flex: 1">
        ${ request.body && html`
          <section class="hero">
            <div class="hero-body py-5">
              ${request.favIconUrl && html`
                <img src=${request.favIconUrl} width="48" style="float:left"/>
              `}
              <h1 class="title is-size-4" style="margin-left: 58px;">
                ${request.originTitle} wants to sign a transaction
              </h1>
            </div>
          </section>

          <section class="section py-0">
          ${ request.body.params.type==="pay" && html`
            <${TxPay} tx=${request.body.params} account=${account} />
          `}
          ${ request.body.params.type==="keyreg" && html`
            <${TxKeyreg} tx=${request.body.params} account=${account} />
          `}
          ${ request.body.params.type==="acfg" && html`
            <${TxAcfg} tx=${request.body.params} account=${account} />
          `}
          ${ request.body.params.type==="axfer" && html`
            <${TxAxfer} tx=${request.body.params} account=${account} />
          `}
          ${ request.body.params.type==="afrz" && html`
            <${TxAfrz} tx=${request.body.params} account=${account} />
          `}
          </section>
        `}
      </div>

      <div class="mx-5 mb-3" style="display: flex;">
        <button id="rejectTx" class="button is-link is-outlined px-6"
          onClick=${deny}>
          Reject
        </button>
        <button id="approveTx" class="button is-primary ml-3"
          style="flex: 1;"
          onClick=${() => {setAskAuth(true)}}>
          Sign!
        </button>
      </div>
    </div>

    ${ askAuth && html`
      <div class="modal is-active">
        <div class="modal-background"></div>
        <div class="modal-content" style="padding: 0 15px;">
          <${Authenticate}
            error=${authError}
            loading=${loading}
            nextStep=${sign} />
        </div>
        <button class="modal-close is-large" aria-label="close" onClick=${()=>setAskAuth(false)} />
      </div>
    `}
  `
}

export default SignTransaction;