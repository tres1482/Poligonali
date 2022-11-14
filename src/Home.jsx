import React, { useEffect, useState }from 'react';
import './home.css';
import '../node_modules/bootstrap/dist/css/bootstrap.min.css';
import { Nav, Navbar } from 'react-bootstrap';
import checkmate from './assets/checkmate.png';
import cover from './assets/cover.png';
import { auth, db } from './firebase';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import abi from './utils/Chess.json';
import './css/styles.css';
import video from './assets/img/chess-demo.mp4';
import board from './assets/img/chess-board.png';

const contractAddress = "0x9c17FCE6a0A8e14Fe6a8e314e169EBe84df66dBC";
const contractABI = abi.abi;

export default function Home() {
    const { currentUser } = auth
    const [showModal, setShowModal] = useState(false)
    const [bidAmount, setBidAmount] = useState(0)
    const [playPiece, setPlayPiece] = useState('w')
    const [isNetworkGoerli, setIsNetworkGoerli] = useState(false);
    const history = useNavigate();
    const BigNumber = ethers.BigNumber;
    const newGameOptions = [
        { label: 'White pieces', value: 'w' },
        { label: 'Black pieces', value: 'b' },
        { label: 'Random', value: 'r' },
    ]
    const [currentAccount, setCurrentAccount] = useState("");
    const [loading, setLoading] = useState(false);

    const checkNetwork = async () => {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        if(chainId=='0x5'){
          setIsNetworkGoerli(true);
        }
        else {
          setIsNetworkGoerli(false);
          alert("Please switch to goerli network");
          checkIfNetworkIsGoerli();
        }
        return chainId;
    }

    const checkIfNetworkIsGoerli = async () => {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        console.log("Chain Id:",chainId);
        if(chainId!="0x5"){
          console.log("Network is not Goerli");
          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [ {chainId: '0x5'} ]
            });
            setIsNetworkGoerli(true);
          } catch (switchError) {
            if(switchError.code===4902) {
              try {
                await window.ethereum.request({
                  method: 'wallet_addEthereumChain',
                  params: [{ chainId: '0x5', chainName: 'Goerli', rpcUrls: ['https://goerli.infura.io/v3/1b2cfca946444a0abf59397e5315cd0c'] }]
                });
              } catch(error) {
                console.error(error);
              }
            } else if(switchError.code===-32002){
              console.error("Request Already pending");
            }
          }
        } else {
          setIsNetworkGoerli(true);
        }
    }

    function handlePlayOnline() {
        if(currentAccount===""){
            connectWallet();
        }
        else{
            if(isNetworkGoerli===true) {
                setShowModal(true);
            }
            else {
                checkIfNetworkIsGoerli();
            }
        }
    }

    async function  creatingGame(gameId, bidAmount, playWhite) {
            if(window.ethereum) {
                const provider = new ethers.providers.Web3Provider(window.ethereum);
                const signer = provider.getSigner();
                const chessContract = new ethers.Contract(contractAddress, contractABI, signer);
                const createGame = await chessContract.createGame(gameId, ethers.utils.parseEther(bidAmount.toString()), playWhite, currentUser.uid.toString(), {value: ethers.utils.parseEther(bidAmount.toString())});
                await createGame.wait();
            }
            else {
                alert("Ethereum Object not Present");
                throw "Ethereum Object not Present";
            }
    }

    async function getBidAmount() {
        if(window.ethereum) {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const chessContract = new ethers.Contract(contractAddress, contractABI, signer);
            // const getGame = await chessContract.joinGame("don9g4739_1639331470385");
            // console.log(getGame);
            let bidAmount = await chessContract.getBidAmountFromLink("don9g4739_1639331470385").then((result) => {return result;});
            // let bidAmount = await bidAmountWaitObj.wait();
            console.log("Bid Amount: ", BigNumber.from(bidAmount).toString());
            // console.log(BigNumber.from(bidAmount));
        }
    }

    async function startOnlineGame(startingPiece) {
        const member = {
            uid: currentUser.uid,
            piece: startingPiece === 'r' ? ['b', 'w'][Math.round(Math.random())] : startingPiece,
            name: localStorage.getItem('userName'),
            creator: true
        }
        const game = {
            status: 'waiting',
            members: [member],
            gameId: `${Math.random().toString(36).substr(2, 9)}_${Date.now()}`
        }
        try {
            await creatingGame(game.gameId, bidAmount, (startingPiece==='w'));
        } catch(error) {
            
            console.error(error);
            return;
        }
        await db.collection('games').doc(game.gameId).set(game)
        history(`/game/${game.gameId}`)
    }

    async function handleChangeBidAmount(event) {
        setBidAmount(event.target.value);
    }

    async function handleChangePlayPiece(event) {
        setPlayPiece(event.target.value);
    }

    async function checkVarsAndStartGame() {
        if(bidAmount===0) {
            alert("Sorry Bid Amount cannot be 0.");
            return;
        }
        else {
            if(playPiece==='') {
                alert("You need to choose at least one of the choice for the play piece");
                return;
            }
            else {
                startOnlineGame(playPiece);
            }
        }
    }

    const checkIfWalletIsConnected = async () => {
        try {
            if (!window.ethereum) {
                console.log("Make sure you have metamask!");
                return;
            } else {
                console.log("We have the ethereum object", window.ethereum);
            }

            const accounts = await window.ethereum.request({ method: 'eth_accounts' });

            if(accounts.length !== 0) {
                const account = accounts[0];
                console.log("Found an authorized account: ", account);
                setCurrentAccount(account);
                setupEventListener();
                if(window.ethereum) {
                    // const provider = new ethers.providers.Web3Provider(window.ethereum);
                    // const signer = provider.getSigner();
                    // const chessContract = new ethers.Contract(contractAddress, contractABI, signer);
                    // const bidAmount = await chessContract.getBidAmountFromLink("don9g4739_1639331470385");
                    // console.log(bidAmount);
                }
            } else {
                console.log("No authorized accout found");
                connectWallet();
            }
        } catch (error) {
            console.log(error);
        }
    }

    const connectWallet = async () => {
        try {
            const { ethereum } = window;

            if(!ethereum) {
                alert("Get Metamask");
                return;
            }

            const accounts = await ethereum.request({ method: "eth_requestAccounts" });

            console.log("Connected", accounts[0]);
            setCurrentAccount(accounts[0]);
            setupEventListener();
        } catch (error) {
            console.log(error);
        }
    }

    const setupEventListener = async () => {
        try {
            const {ethereum} = window;

            if(ethereum) {
                window.ethereum.on('accountsChanged', (accounts) => {
                    console.log(accounts);
                    if(accounts.length==0) {
                      setCurrentAccount("");
                    }
                    else {
                      setCurrentAccount(accounts[0]);
                    }
                  })
          
                  window.ethereum.on('chainChanged', (chainId) => {
                    if(chainId=='0x5'){
                      setIsNetworkGoerli(true);
                    }
                    else {
                      setIsNetworkGoerli(false);
                      alert("Please switch to goerli network");
                      checkIfNetworkIsGoerli();
                    }
                  })
            } else {
                console.error("Ethereum Object doesn't exists");
            }
        } catch (error) {
            console.log(error);
        }
    }

    useEffect(() => {
        checkIfWalletIsConnected();
    })
    if(loading) {
        return "Loading...";
    }
    return (
    <>
                <nav className="navbar navbar-expand-lg navbar-light fixed-top shadow-sm" id="mainNav">
                <div className="container px-5">
                    <a className="navbar-brand fw-bold" href="#page-top">Poligonali</a>
                    <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarResponsive" aria-controls="navbarResponsive" aria-expanded="false" aria-label="Toggle navigation">
                        
                        <i className="bi-list"></i>
                    </button>
                    <div className="collapse navbar-collapse" id="navbarResponsive">
                        {/* <!-- <ul className="navbar-nav ms-auto me-4 my-3 my-lg-0">
                            <li className="nav-item"><a className="nav-link me-lg-3" href="#features">Features</a></li>
                            <li className="nav-item"><a className="nav-link me-lg-3" href="#download">Download</a></li>
                        </ul> --> */}

                        {currentAccount===""?
                            (<button className="btn btn-primary rounded-pill px-3 mb-2 mb-lg-0" onClick={connectWallet}>
                                <span className="d-flex align-items-center">
                                    {/* <!-- <i className="bi-chat-text-fill me-2"></i> --> */}
                                    
                                        <span className="small">Connect Wallet</span>
                                </span>
                            </button>):
                            (
                                <span></span>
                            )
                        }

                        <button className="btn btn-primary rounded-pill px-3 mb-2 mb-lg-0" onClick={handlePlayOnline}>
                            <span className="d-flex align-items-center">
                                {/* <!-- <i className="bi-chat-text-fill me-2"></i> --> */}
                                <span className="small">Play Online</span>
                            </span>
                        </button>
                        {/* <button className="btn btn-primary rounded-pill px-3 mb-2 mb-lg-0">
                            <span className="d-flex align-items-center">
                                <span className="small">Active Game</span>
                            </span>
                        </button>
                        <button className="btn btn-primary rounded-pill px-3 mb-2 mb-lg-0" data-bs-toggle="modal" data-bs-target="#feedbackModal">
                            <span className="d-flex align-items-center">
                                <i className="bi-chat-text-fill me-2"></i>
                                <span className="small">Send Feedback</span>
                            </span>
                        </button> */}
                    </div>
                </div>
            </nav>
            {/* <!-- Mashead header--> */}
            <header className="masthead">
                <div className="container px-5">
                    <div className="row gx-5 align-items-center">
                        <div className="col-lg-6">
                            {/* <!-- Mashead text and app badges--> */}
                            <div className="mb-5 mb-lg-0 text-center text-lg-start">
                                <h1 className="display-1 lh-1 mb-3">Web3 Chess Game.</h1>
                                <p className="lead fw-normal text-muted mb-5">Experience the first decentralised Chess Game where you can play with anyone from around the world bidding and earning cryptocurrency !</p>
                                {/* <!-- <div className="d-flex flex-column flex-lg-row align-items-center">
                                    <a className="me-lg-3 mb-4 mb-lg-0" href="#!"><img className="app-badge" src="assets/img/google-play-badge.svg" alt="..." /></a>
                                    <a href="#!"><img className="app-badge" src="assets/img/app-store-badge.svg" alt="..." /></a>
                                </div> --> */}
                            </div>
                        </div>
                        <div className="col-lg-6">
                            {/* <!-- Masthead device mockup feature--> */}
                            <div className="masthead-device-mockup">
                                {/* <!-- <svg className="circle" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"> */}
                                    {/* <defs>
                                        <linearGradient id="circleGradient" gradientTransform="rotate(45)">
                                            <stop className="gradient-start-color" offset="0%"></stop>
                                            <stop className="gradient-end-color" offset="100%"></stop>
                                        </linearGradient>
                                    </defs>
                                    <circle cx="50" cy="50" r="50"></circle></svg
                                ><svg className="shape-1 d-none d-sm-block" viewBox="0 0 240.83 240.83" xmlns="http://www.w3.org/2000/svg">
                                    <rect x="-32.54" y="78.39" width="305.92" height="84.05" rx="42.03" transform="translate(120.42 -49.88) rotate(45)"></rect>
                                    <rect x="-32.54" y="78.39" width="305.92" height="84.05" rx="42.03" transform="translate(-49.88 120.42) rotate(-45)"></rect></svg
                                ><svg className="shape-2 d-none d-sm-block" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="50"></circle></svg> --> */}
                                <div className="device-wrapper">
                                    <div className="device" data-device="iPhoneX" data-orientation="portrait" data-color="black">
                                        <div className="screen bg-black">
                                            {/* <!-- PUT CONTENTS HERE:-->
                                            <!-- * * This can be a video, image, or just about anything else.-->
                                            <!-- * * Set the max width of your media to 100% and the height to-->
                                            <!-- * * 100% like the demo example below.--> */}
                                            <video muted="muted" autoplay="" loop="" style={{maxWidth: "100%", height: "100%"}}><source src={video} type="video/mp4" /></video>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>
            {/* <!-- Quote/testimonial aside--> */}
            <aside className="text-center bg-gradient-primary-to-secondary">
                <div className="container px-5">
                    <div className="row gx-5 justify-content-center">
                        <div className="col-xl-8">
                            <div className="h2 fs-1 text-white mb-4">"An intuitive solution to a common problem that we all face, wrapped up in a single app!"</div>
                            {/* <!-- <img src="assets/img/tnw-logo.svg" alt="..." style="height: 3rem" /> --> */}
                        </div>
                    </div>
                </div>
            </aside>
            
            {/* <!-- Basic features section--> */}
            <section className="bg-light">
                <div className="container px-5">
                    <div className="row gx-5 align-items-center justify-content-center justify-content-lg-between">
                        <div className="col-12 col-lg-5">
                            <h2 className="display-4 lh-1 mb-4">Experience the age of playing chess in the world of Web3.</h2>
                            <p className="lead fw-normal text-muted mb-5 mb-lg-0">This section is perfect for featuring information about our web application,
                                why it was built, the problem it solves, or anything else!
                                Basically, a sneak-peak about how to use the website!</p>
                        </div>
                        <div className="col-sm-8 col-md-6">
                            <div className="px-5 px-sm-0">
                                <img className="img-fluid rounded-circle" src={board} alt="..." />
                                {/* <!-- <video className="img-fluid rounded-circle" muted="muted" autoplay="" loop=""><source src="assets/img/demo-screen.mp4" type="video/mp4" alt="..." /></video> --> */}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            {/* <!-- Footer--> */}
            <footer className="bg-black text-center py-5">
                <div className="container px-5">
                    <div className="text-white-50 small">
                        <div className="mb-2">&copy; Poligonali 2021. All Rights Reserved.</div>
                        <a href="#!">Privacy</a>
                        <span className="mx-1">&middot;</span>
                        <a href="#!">Terms</a>
                        <span className="mx-1">&middot;</span>
                        <a href="#!">FAQ</a>
                    </div>
                </div>
            </footer>
            {/* <!-- Feedback Modal--> */}
            <div className="modal fade" id="feedbackModal" tabIndex="-1" aria-labelledby="feedbackModalLabel" aria-hidden="true">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header bg-gradient-primary-to-secondary p-4">
                            <h5 className="modal-title font-alt text-white" id="feedbackModalLabel">Send feedback</h5>
                            <button className="btn-close btn-close-white" type="button" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div className="modal-body border-0 p-4">
                        
                            <form id="contactForm" data-sb-form-api-token="API_TOKEN">
                                {/* <!-- Name input--> */}
                                <div className="form-floating mb-3">
                                    <input className="form-control" id="name" type="text" placeholder="Enter your name..." data-sb-validations="required" />
                                    <label htmlFor="name">Full name</label>
                                    <div className="invalid-feedback" data-sb-feedback="name:required">A name is required.</div>
                                </div>
                                {/* <!-- Email address input--> */}
                                <div className="form-floating mb-3">
                                    <input className="form-control" id="email" type="email" placeholder="name@example.com" data-sb-validations="required,email" />
                                    <label for="email">Email address</label>
                                    <div className="invalid-feedback" data-sb-feedback="email:required">An email is required.</div>
                                    <div className="invalid-feedback" data-sb-feedback="email:email">Email is not valid.</div>
                                </div>
                                {/* <!-- Phone number input--> */}
                                <div className="form-floating mb-3">
                                    <input className="form-control" id="phone" type="tel" placeholder="(123) 456-7890" data-sb-validations="required" />
                                    <label for="phone">Phone number</label>
                                    <div className="invalid-feedback" data-sb-feedback="phone:required">A phone number is required.</div>
                                </div>
                                {/* <!-- Message input--> */}
                                <div className="form-floating mb-3">
                                    <textarea className="form-control" id="message" type="text" placeholder="Enter your message here..." style={{ height : "10rem"}} data-sb-validations="required"></textarea>
                                    <label for="message">Message</label>
                                    <div className="invalid-feedback" data-sb-feedback="message:required">A message is required.</div>
                                </div>
                                {/* <!-- Submit success message-->
                                <!---->
                                <!-- This is what your users will see when the form-->
                                <!-- has successfully submitted--> */}
                                <div className="d-none" id="submitSuccessMessage">
                                    <div className="text-center mb-3">
                                        <div className="fw-bolder">Form submission successful!</div>
                                        
                                    </div>
                                </div>
                                {/* <!-- Submit error message-->
                                <!---->
                                <!-- This is what your users will see when there is-->
                                <!-- an error submitting the form--> */}
                                <div className="d-none" id="submitErrorMessage"><div className="text-center text-danger mb-3">Error sending message!</div></div>
                                {/* <!-- Submit Button--> */}
                                <div className="d-grid"><button className="btn btn-primary rounded-pill btn-lg disabled" id="submitButton" type="submit">Submit</button></div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
                {/* <Navbar bg="dark" variant="dark" 
            sticky="top" expand="lg">
                <Navbar.Brand>
                    <img src={checkmate} width ="60px" height="60px" />{' '}
                    Poligonali
                </Navbar.Brand>

                <Navbar.Toggle />
                <Navbar.Collapse>
                <Nav>
                    <Nav.Link href="">
                    
                    <div>
                        <button className="button is-link" onClick={connectWallet}>
                            Connect Wallet
                        </button>
                    </div>
                        </Nav.Link>

                    <Nav.Link href="">
                    <div>
                        <button className="button is-link"
                            onClick={handlePlayOnline}>
                            Play Online
                        </button>
                    </div>
                        </Nav.Link>

                    <Nav.Link href="active"><button className="button is-link">
                        Active Game
                    </button>

                    </Nav.Link>
                    <Nav.Link href="">
                        <button className='button is-link' onClick={getBidAmount}>Get Bid Amount</button>
                    </Nav.Link>

                </Nav>
                </Navbar.Collapse>  
            </Navbar>
                {/* <div className="columns home">
                    {!currentAccount && (
                    <div className="column has-background-primary home-columns">
                        <button className="button is-link" onClick={connectWallet}>
                            Connect Wallet
                        </button>
                    </div>)}
                    <div className="column has-background-link home-columns">
                        <button className="button is-primary"
                            onClick={handlePlayOnline}>
                            Play Online
                        </button>
                    </div>
                </div> */}

                <div className={`modal ${showModal ? 'is-active' : ''}`}>
                    <div className="modal-background"></div>
                    <div className="modal-content" style={{width: 40+'%'}}>
                        <div className="card">
                        <input type="number" placeholder='Bid Amount' onChange={handleChangeBidAmount}></input>
                                <div className="field">
                                    <label className="label">Choose Your Play Piece</label>
                                        <div className="control">
                                            <div className="select">
                                                <select>
                                                    {newGameOptions.map(({ label, value }) => (
                                                        <option key={value} onChange={handleChangePlayPiece}>{label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                </div>
                                <button onClick={checkVarsAndStartGame}>Submit</button> 
                            {/* <div className="card-content">
                                <div className="content">
                                    Please Select the piece you want to start
                                </div>

                            </div>
                            <footer className="card-footer">
                                {newGameOptions.map(({ label, value }) => (
                                    <span className="card-footer-item pointer" key={value}
                                        onClick={() => startOnlineGame(value)}>
                                        {label}
                                    </span>
                                ))}
                            </footer>
                        </div>
                        <div className='card'>
                            <div className='card-content'>
                                <div className='content'>
                                    Select The amount you wan to bid
                                </div>
                            </div>
                            <footer className='card-footer'>
                                <input type="number" placeholder='Bid Amount'></input>
                            </footer> */}
                        </div> 
                        </div>
                        <button className="modal-close is-large" onClick={() => setShowModal(false)}></button>
                    </div>
                {/* </div> */}
            </>
    )
}