import './App.css';
import { WalletProvider } from './components/WalletContext';
import Shell from './components/Shell';

function App() {
  return (
    <WalletProvider>
      <Shell />
    </WalletProvider>
  );
}

export default App;
