import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SplitBill from './SplitBill';

// Mock the API functions
jest.mock('../services/api', () => ({
  transactionApi: {
    getTransactionsByFolio: jest.fn(),
  },
  advanceApi: {
    getAdvancesByFolio: jest.fn(),
  },
  billApi: {
    getBillByBillNo: jest.fn(),
    getRelatedBills: jest.fn(),
  },
}));

describe('SplitBill Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders without crashing', () => {
    render(<SplitBill />);
    expect(screen.getByText('Split Bill')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter bill number (e.g., B1-25-26) and click Search')).toBeInTheDocument();
  });

  test('shows search input and button', () => {
    render(<SplitBill />);
    expect(screen.getByPlaceholderText('Enter bill number (e.g., B1-25-26) and click Search')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
  });

  test('displays message when no bill is searched', () => {
    render(<SplitBill />);
    expect(screen.getByText('Enter a bill number above to search for bills and split items.')).toBeInTheDocument();
  });
});