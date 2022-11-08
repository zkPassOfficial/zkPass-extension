import './App.css'
import DebugPage from './debug'

const env = process.env.REACT_APP_RUN_TYPE

function App() {
  if(env === 'development'){
    return <DebugPage/>
  }

  return (
    <div className='App'>
      <header className='App-header'>
      </header>
    </div>
  )
}

export default App