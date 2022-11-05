import styled from 'styled-components'
import MPCControler from '../mpc'

const Conatiner = styled.div`
  width: 100vw;
  height: 100vh;
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

  return <Conatiner>
    <Title>Debugger</Title>
    <ButtonContainer>
      <Button onClick={runMpc}>Run MPC</Button>
    </ButtonContainer>
  </Conatiner>
}