import { advanceApi } from '../services/api';

// Mock the axios client
jest.mock('../services/api', () => {
  const mockApiResponse = {
    data: {
      success: true,
      message: 'Advance deleted successfully',
      data: null,
      timestamp: '2025-09-29T01:12:58.455462200'
    }
  };

  return {
    advanceApi: {
      deleteAdvance: jest.fn().mockResolvedValue(mockApiResponse)
    }
  };
});

describe('Delete Advance Functionality', () => {
  it('should delete an advance by ID', async () => {
    const advanceId = 'R1-25-26';
    
    const response = await advanceApi.deleteAdvance(advanceId);
    
    expect(advanceApi.deleteAdvance).toHaveBeenCalledWith(advanceId);
    expect(response.data.success).toBe(true);
    expect(response.data.message).toBe('Advance deleted successfully');
  });
});