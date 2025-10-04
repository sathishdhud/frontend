import { advanceApi } from '../services/api';
import { Advance } from '../types/api';

// Mock the axios client
jest.mock('../services/api', () => {
  const mockApiResponse = {
    data: {
      success: true,
      message: 'Advance updated successfully',
      data: {
        advanceId: '1',
        receiptNo: 'ADV001',
        reservationNo: 'R1-25-26',
        guestName: 'John Doe Updated',
        date: '2024-01-15',
        modeOfPaymentId: 'CARD',
        modeOfPaymentName: 'Credit Card',
        amount: 5500.00,
        creditCardCompany: 'Visa Platinum',
        cardNumber: '**** **** **** 1234',
        details: 'Updated card payment details',
        narration: 'Updated advance payment via credit card'
      },
      timestamp: '2025-09-29T01:12:58.455462200'
    }
  };

  return {
    advanceApi: {
      updateAdvance: jest.fn().mockResolvedValue(mockApiResponse)
    }
  };
});

describe('Update Advance Functionality', () => {
  it('should update an advance by ID', async () => {
    const advanceId = '1';
    const updateData: Partial<Advance> = {
      guestName: 'John Doe Updated',
      modeOfPaymentId: 'CARD',
      amount: 5500.00,
      creditCardCompany: 'Visa Platinum',
      cardNumber: '**** **** **** 1234',
      details: 'Updated card payment details',
      narration: 'Updated advance payment via credit card'
    };
    
    const response = await advanceApi.updateAdvance(advanceId, updateData);
    
    expect(advanceApi.updateAdvance).toHaveBeenCalledWith(advanceId, updateData);
    expect(response.data.success).toBe(true);
    expect(response.data.message).toBe('Advance updated successfully');
    expect(response.data.data.guestName).toBe('John Doe Updated');
    expect(response.data.data.amount).toBe(5500.00);
  });
});