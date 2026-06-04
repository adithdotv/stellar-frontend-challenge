import { render, screen } from '@testing-library/react';
import App from './App';

// The Stellar SDK ships ESM/TS sources that CRA's Jest can't transform, so we
// mock the wallet/network layer. This keeps the component test focused on UI
// and navigation rather than on-chain calls.
jest.mock('./components/Freighter', () => ({
  NETWORK: 'TESTNET',
  NETWORK_PASSPHRASE: 'Test SDF Network ; September 2015',
  HORIZON_URL: '',
  FRIENDBOT_URL: '',
  connect: jest.fn(),
  disconnect: jest.fn(),
  getXlmBalance: jest.fn().mockResolvedValue('0'),
  isWalletAllowed: jest.fn().mockResolvedValue(false),
  getPublicKey: jest.fn().mockResolvedValue(''),
  requestTestnetXlm: jest.fn(),
  getRecentPayments: jest.fn().mockResolvedValue([]),
  sendPayment: jest.fn(),
}));

test('renders the app brand and section navigation', () => {
  render(<App />);
  expect(screen.getByText(/Stellar DApp/i)).toBeInTheDocument();
  // Section nav should expose the utilities.
  expect(screen.getByRole('button', { name: /Tip Jar/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Split Bill/i })).toBeInTheDocument();
});
