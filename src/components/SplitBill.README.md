# Split Bill Component

## Overview
The SplitBill component allows cashiers to split bills for company guests who need separate bills for different charges (e.g., room bills separate from restaurant/liquor bills).

## Features
1. **Bill Search**: Search for bills by bill number (e.g., B1-25-26)
2. **Guest Bill Display**: Shows all bills associated with the guest
3. **Item Selection**: Select specific charges and advances to split into a new bill
4. **PDF Generation**: Generate and download a PDF of the split bill
5. **Manual Search**: Search is triggered only when the user clicks the Search button

## How It Works
1. Enter a complete bill number in the format B1-25-26
2. Click the Search button to fetch bill data
3. View all bills associated with the guest
4. Select items to split into a new bill
5. Enter a name for the new bill
6. Click "Split Bill" to generate a PDF

## Usage
```jsx
import SplitBill from '../components/SplitBill';

function CashierPage() {
  return (
    <SplitBill onSplitComplete={() => {
      // Handle completion
    }} />
  );
}
```

## Props
- `onSplitComplete` (optional): Callback function called when a bill is successfully split

## Dependencies
- jsPDF for PDF generation
- Hotel management system APIs for bill, transaction, and advance data

## Implementation Details
- Uses billApi to fetch bill data by bill number
- Uses related bills API to show all bills for the guest
- Uses transactionApi and advanceApi to fetch items for splitting
- Generates PDFs with bill details and selected items
- No auto-search - only searches when user clicks Search button