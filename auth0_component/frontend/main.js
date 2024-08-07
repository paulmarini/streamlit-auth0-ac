import { Streamlit } from "streamlit-component-lib"
import createAuth0Client from '@auth0/auth0-spa-js';
import Toastify from 'toastify-js'
import "toastify-js/src/toastify.css"
import "./style.css"

const div = document.body.appendChild(document.createElement("div"))
const button = div.appendChild(document.createElement("button"))
button.className = "log"
button.textContent = "Login"

// set flex column so the error message appears under the button
div.style = "display: flex; flex-direction: column; margin: 0; padding: 10px;"
const errorDiv = div.appendChild(document.createElement("div"))
errorDiv.className = "error"
errorDiv.style = "display: block; padding: 4px; color: rgba(255, 108, 108, .8); font-family: 'Source Sans Pro', sans-serif; font-size: .95rem;"
const errorNode = errorDiv.appendChild(document.createTextNode(""))

// Global vars
let client_id
let domain
let audience
let auth0
let token
let user

const logout = async () => {
  auth0.logout({ returnTo: getOriginUrl() })
  Streamlit.setComponentValue(false)
  button.textContent = "Login"
  button.removeEventListener('click', logout)
  button.addEventListener('click', login)
}

const login = async () => {
  button.textContent = 'working...'
  errorNode.textContent = ''
  console.log('Callback urls set to: ', getOriginUrl())
  auth0 = await createAuth0Client({
    domain: domain,
    client_id: client_id,
    redirect_uri: getOriginUrl(),
    audience: audience,
    useRefreshTokens: true,
    // cacheLocation: "localstorage",
  });

  // Remove the event listener for login before adding a new one for logout
  button.removeEventListener('click', login);

  try {
    console.log(`DEBUG: trying auth0.loginWithPopup()`) //debug
    await auth0.loginWithPopup();
    errorNode.textContent = ''
  }
  catch (err) {
    console.error(`DEBUG: auth0_component error at loginWithPopup: ${err}`)
    errorNode.textContent = err;
    Streamlit.setFrameHeight()
    button.textContent = "Login"
    button.removeEventListener('click', logout)
    button.addEventListener('click', login)
    return
  }

  try {
    console.log(`DEBUG: trying auth0.getUser()`) //debug
    user = await auth0.getUser();
  } 
  catch (err) {
    console.error(`DEBUG: auth0_component error at getUser: ${err}`)
    errorNode.textContent = err;
    Streamlit.setFrameHeight()
  }

  try {
    console.log(`DEBUG: trying auth0.getTokenSilently()`) //debug
    token = await auth0.getTokenSilently({
      audience: audience,
    });
    console.log(`DEBUG: token: ${token}`)   //debug
  }
  catch (err) {
    console.error(`DEBUG: auth0_component error at auth0.getTokenSilently()`) //debug
    if (err.error === 'consent_required' || err.error === 'login_required') {
      console.log(`${err.error}. Asking user for permission to their profile`)
      token = await auth0.getTokenWithPopup({
        audience: audience,
        scope: "read:current_user",
      });
      console.log(`DEBUG: token: ${token}`)   //debug
    }
    else { console.error(err) }
  }

  let userCopy = JSON.parse(JSON.stringify(user));
  userCopy.token = token
  console.log(userCopy);        //debug
  Streamlit.setComponentValue(userCopy)
  button.textContent = "Logout"
  button.removeEventListener('click', login)
  button.addEventListener('click', logout)
}

// Make sure to initialize the button's event listener with the login function
button.addEventListener('click', login);
//button.onclick = login

function onRender(event) {
  const data = event.detail

  client_id = data.args["client_id"]
  domain = data.args["domain"]
  audience = data.args["audience"]

  Streamlit.setFrameHeight()
}

Streamlit.events.addEventListener(Streamlit.RENDER_EVENT, onRender)
Streamlit.setComponentReady()

const getOriginUrl = () => {
  // Detect if you're inside an iframe
  if (window.parent !== window) {
    const currentIframeHref = new URL(document.location.href)
    const urlOrigin = currentIframeHref.origin
    const urlFilePath = decodeURIComponent(currentIframeHref.pathname)
    // Take referrer as origin
    return urlOrigin + urlFilePath
  } else {
    return window.location.origin
  }
}