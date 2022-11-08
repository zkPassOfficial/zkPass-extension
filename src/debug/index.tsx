import styled from 'styled-components'
import MPCControler from '../mpc'

const Conatiner = styled.div`
  width: 400px;
  height: 400px;
  color: #FFFFFF;
  background: #000000;
`

const Title = styled.h1`
  margin-top: 0;
`

const ButtonContainer = styled.div`
  display: flex;
  padding: 10px;
  margin: 10px auto;
`
const Button = styled.button`
  border: 1px solid #FFFFFF;
  margin: 8px;
`

export default function DebugPage() {

  const runMpc = async () => {
    const nodeInfo = {
      ip: '192.168.1.8',
      port: 3000,
      pubkey: new Uint8Array(16).fill(0),
      sessionId: ''
    }

    const mpc = new MPCControler(nodeInfo, 1000)
    await mpc.init()

  }

  const print = () => {
    chrome.runtime.sendMessage({
      action: 'xxx'
    })
  }

  const sendClientHello = async () => {
    chrome.runtime.sendMessage({
      action: 'clientHello'
    })
  }

  return <Conatiner>
    <Title>Debugger</Title>
    <ButtonContainer>
      <Button onClick={runMpc}>Run MPC</Button>
    </ButtonContainer>
    <ButtonContainer>
      <Button onClick={print}>print</Button>
    </ButtonContainer>
    <ButtonContainer>
      <Button onClick={sendClientHello}>sendClientHello</Button>
    </ButtonContainer>
  </Conatiner>
}