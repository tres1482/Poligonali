import React, { useEffect, useState } from 'react'
import './App.css'
import { gameSubject, initGame, resetGame } from './Game'
import Board from './Board'
import { useParams, useNavigate } from 'react-router-dom'
import { db } from './firebase'
import { ethers } from 'ethers'
import abi from './utils/Chess.json';

const contractAddress = "0x7ea65874ebe85f1a6a7553cf69ff9d900b2280dc";
const contractABI = abi.abi;

function GameApp() {
  const [board, setBoard] = useState([])
  const [isGameOver, setIsGameOver] = useState()
  const [result, setResult] = useState()
  const [position, setPosition] = useState()
  const [initResult, setInitResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [game, setGame] = useState({})
  const [join, setJoin] = useState(false);
  const [gameBidAmount, setGameBidAmount]  = useState("...");
  const { id } = useParams()
  const history = useNavigate()
  const sharebleLink = window.location.href
  const BigNumber = ethers.BigNumber;

  async function getBidAmount() {
    if(window.ethereum) {
      const accounts = await window.ethereum.request({method: "eth_requestAccounts"});
      if(accounts.length!==0) {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const chessContract = new ethers.Contract(contractAddress, contractABI, signer);
        const bidAmount = await chessContract.getBidAmountFromLink(game.id).then((result) => {return result;});
        setGameBidAmount(bidAmount.toString());
        return gameBidAmount;
      }
    }
  }

  async function joiningGame(gameId) {
    console.log('joiningGame');
    if(window.ethereum) {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if(accounts.length!==0){
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const chessContract = new ethers.Contract(contractAddress, contractABI, signer);
        const isInGame = await chessContract.isInGame(accounts[0]).then((result) => {return result;});
        if(isInGame){
          console.log("Already in a game")
          return;
        }
        const bidAmount = await chessContract.getBidAmountFromLink(gameId).then((result) => {return result;});
        console.log(bidAmount);
        const createGame = await chessContract.joinGame(gameId, {value: BigNumber.from(bidAmount)});
        await createGame.wait();
        setJoin(true);
      }
    }
    else {
      alert("Ethereum Object not Present");
      throw "Ethereum Object not Present";
    }
  }

  async function endingGame() {
    console.log('endingGame');
    let res = "Draw";
    if(result==="CHECKMATE - WINNER - WHITE"){
      res = "White";
    }
    else if(result==="CHECKMATE - WINNER - BLACK"){
      res = "Black";
    }

    if(window.ethereum) {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if(accounts.length!==0) {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const chessContract = new ethers.Contract(contractAddress, contractABI, signer);
        const endGame = await chessContract.endGame(id, res, {gasLimit: 1000000});
        await endGame.wait();
      }
      else {
        console.error("No accounts found");
      }
    }
    else {
      alert("Ethereum Object not Present");
      throw "Ethereum Object not Present"
    }
  }

  useEffect(() => {
    let subscribe
    async function init() {
      const res = await initGame(id !== 'local' ? db.doc(`games/${id}`) : null);
      setInitResult(res)
      setLoading(false)
      if (!res) {
        subscribe = gameSubject.subscribe((game) => {
          setBoard(game.board)
          setIsGameOver(game.isGameOver)
          setResult(game.result)
          setPosition(game.position)
          setStatus(game.status)
          setGame(game)
        });
      }

    }

    init()

    return () => subscribe && subscribe.unsubscribe()
  }, [id])

  async function copyToClipboard() {
    await navigator.clipboard.writeText(sharebleLink)
  }

  async function userInGame() {
    if(window.ethereum) {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if(accounts.length!==0) {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const chessContract = new ethers.Contract(contractAddress, contractABI, signer);
        const isInGame = await chessContract.isInGame(accounts[0]).then((result) => {return result;});
        console.log("Is in Game: ", isInGame);
        setJoin(isInGame);
      }
    }
  }

  if (loading) {
    return 'Loading ...'
  }
  if (initResult === 'notfound') {
    return 'Game Not found'
  }

  if (initResult === 'intruder') {
    return 'The game is already full'
  }
  if(game.isGameOver===undefined) {
    return 'Loading ...';
  }

  if(!join){
    userInGame();
    return (
      <div>
        <div>
          {/* {game.opponent.name} is already in the game. */}
          <br />
          Pay {getBidAmount} ether to join the game.
        </div>
        <button onClick={() => {
          try{
            joiningGame(id)
          } catch(error) {
            console.error(error);
          }
        }}>Join Game</button>
      </div>
    )
  }

  function showAfterGameModal() {
    console.log("Game : ", game);
    let res;
    if(isGameOver) {
      if(result==="CHECKMATE - WINNER - WHITE") {
        res = 'w';
      }
      else if(result==="CHECKMATE - WINNER - BLACK") {
        res = 'b';
      }
      return (
        <div className="modal is-active">
          <div className="modal-content">
            <h1>{(res===game.position) ? "Congratulations!!!" : "Better Luck Next Time"}</h1>
            {(res===game.position)?<button onClick={endingGame}>Collect Your Rewards!!</button>:<button onClick={() => history('/')}>Back to home</button>}
          </div>
        </div>
      )
    }
  }

  

  return (
    <div className="app-container">
      {/* {isGameOver && (
        <h2 className="vertical-text">
          GAME OVER
          <button onClick={async () => {
            await resetGame()
            history('/')
          }}>
            <span className="vertical-text"> NEW GAME</span>
          </button>
        </h2>
      )} */}
      {isGameOver && showAfterGameModal()}
      <div className="board-container">
        {game.oponent && game.oponent.name && <span className="tag is-link">{game.oponent.name}</span>}
        <Board board={board} position={position} />
        {game.member && game.member.name && <span className="tag is-link">{game.member.name}</span>}
      </div>
      {/* {result && <p className="vertical-text">{result}</p>} */}
      {status === 'waiting' && (
        <div className="notification is-link share-game">
          <strong>Share this game to continue</strong>
          <br />
          <br />
          <div className="field has-addons">
            <div className="control is-expanded">
              <input type="text" name="" id="" className="input" readOnly value={sharebleLink} />
            </div>
            <div className="control">
              <button className="button is-info" onClick={copyToClipboard}>Copy</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default GameApp
