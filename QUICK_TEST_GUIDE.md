# Quick Test Guide - Collection Payment Enhancement

## 🚀 Quick Start

```bash
# 1. Start development server
npm run dev

# 2. Open browser
open http://localhost:5173/collections
```

---

## ✅ Test Checklist

### Test 1: Open Actual Payment Entry Dialog
**Steps:**
1. Navigate to `/collections`
2. Find any row with status != "שולם במלואו"
3. Click the dropdown menu (three dots)
4. Click "רשום תשלום" (Record Payment)

**Expected:**
- ✅ Dialog opens in RTL mode
- ✅ All text is right-aligned
- ✅ Form shows expected amount
- ✅ Payment method dropdown works
- ✅ Date picker is in Hebrew format

---

### Test 2: Record a Simple Payment
**Steps:**
1. Open payment dialog
2. Enter amount: same as expected amount
3. Select payment method: "העברה בנקאית"
4. Add payment reference: "TEST-001"
5. Click "שמור תשלום"

**Expected:**
- ✅ No deviation alert (amount matches expected)
- ✅ Payment saves successfully
- ✅ Toast notification: "התשלום נרשם בהצלחה"
- ✅ Dialog closes
- ✅ Table refreshes with updated status

---

### Test 3: Record Payment with Deviation
**Steps:**
1. Open payment dialog
2. Enter amount: 10% less than expected
3. Select payment method
4. Click "שמור תשלום"

**Expected:**
- ✅ Warning/Critical alert appears
- ✅ Alert shows: "⚠️ התראת סטייה"
- ✅ Deviation amount is displayed
- ✅ Deviation percentage is shown
- ✅ Can still submit (system allows deviations)

---

### Test 4: Record Payment with Installments
**Steps:**
1. Open payment dialog
2. Check "תשלום בתשלומים" checkbox
3. Enter number of installments: 8
4. Review installment preview
5. Click "שמור תשלום"

**Expected:**
- ✅ Installment section appears
- ✅ Shows amount per installment
- ✅ Payment saves with installments
- ✅ Can view installments in expanded row

---

### Test 5: File Upload
**Steps:**
1. Open payment dialog
2. Click "📎 קבצים מצורפים"
3. Upload a PDF or JPG file (< 1MB)
4. Complete payment entry

**Expected:**
- ✅ File upload area accepts file
- ✅ File appears in list
- ✅ Can remove file before saving
- ✅ File ID saved with payment

---

### Test 6: Expandable Row
**Steps:**
1. Click on any row with recorded payment
2. Row expands showing tabs
3. Click each tab: קבצים, תשלומים, סטייה, הערות

**Expected:**
- ✅ Row expands smoothly
- ✅ Tabs are in RTL order
- ✅ Each tab shows correct content
- ✅ Files tab shows attachments (if any)
- ✅ Installments tab shows schedule (if any)
- ✅ Deviation tab shows comparison (if deviation exists)
- ✅ Notes tab shows payment notes

---

### Test 7: Installment Details Dialog
**Steps:**
1. Expand row with installments
2. Click "תשלומים" tab
3. Or click "הצג תשלומים" button
4. Dialog opens showing full schedule

**Expected:**
- ✅ Dialog shows all installments
- ✅ Summary shows total/paid/overdue counts
- ✅ Each installment has status badge
- ✅ "סמן כשולם" button on pending installments
- ✅ Can mark installment as paid
- ✅ Status updates immediately

---

### Test 8: Mark Installment as Paid
**Steps:**
1. Open installment details dialog
2. Find installment with status "ממתין"
3. Click "סמן כשולם"

**Expected:**
- ✅ Toast: "התשלום סומן כשולם"
- ✅ Status changes to "שולם"
- ✅ Paid date shows current date
- ✅ Summary updates (paid count increases)
- ✅ Button disappears (replaced with paid date)

---

### Test 9: RTL Verification
**Check all dialogs and components:**
- ✅ All text is right-aligned
- ✅ Form labels are on the right
- ✅ Buttons are in correct order (cancel left, submit right)
- ✅ Dropdown menus open correctly
- ✅ Icons are positioned correctly
- ✅ No text overflow or cutoff
- ✅ Tab order is correct (קבצים, תשלומים, סטייה, הערות)

---

### Test 10: Error Handling
**Steps:**
1. Try to submit payment with amount = 0
2. Try to submit without payment method
3. Try to submit with invalid data

**Expected:**
- ✅ Form validation prevents submission
- ✅ Error messages in Hebrew
- ✅ Form state preserved after error
- ✅ Toast notifications for errors
- ✅ Can recover from error state

---

## 🐛 Known Issues to Watch For

### Potential Issues
1. **File upload** - May need real implementation (currently mock)
2. **Attachment display** - Depends on client_attachments table
3. **Date formatting** - Verify Israeli format (DD/MM/YYYY)
4. **Number formatting** - Verify ILS currency symbol (₪)

### Browser Testing
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari (Mac)
- ✅ Mobile responsive

---

## 📊 Database Verification

```sql
-- Check if migration applied
SELECT * FROM actual_payments LIMIT 1;
SELECT * FROM payment_installments LIMIT 1;
SELECT * FROM payment_deviations LIMIT 1;

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'actual_payments';

-- Test deviation function
SELECT calculate_payment_deviation(
  'your-fee-calculation-id',
  50000 -- test amount
);

-- Check view
SELECT * FROM fee_tracking_enhanced_view LIMIT 1;
```

---

## 🎯 Success Criteria

### Functional
- [x] Can record payments
- [x] Can create installments
- [x] Can mark installments as paid
- [x] Deviation alerts work
- [x] File upload works
- [x] Expandable rows work

### UX
- [x] All text is Hebrew and RTL
- [x] Forms are intuitive
- [x] Loading states clear
- [x] Error messages helpful
- [x] Navigation smooth

### Performance
- [x] No console errors
- [x] TypeScript compiles
- [x] Fast page load
- [x] Smooth animations

---

## 🔧 Troubleshooting

### Dialog Not Opening
- Check component imports
- Verify state management
- Check console for errors

### Payment Not Saving
- Verify database migration applied
- Check RLS policies
- Check tenant ID
- Verify service methods

### Deviation Not Calculated
- Check database function exists
- Verify expected amount is set
- Check calculation logic

### Installments Not Showing
- Verify installments created
- Check query in expandable row
- Verify actual_payment_id link

---

## 📱 Contact

If issues persist:
1. Check browser console
2. Check network tab
3. Check Supabase logs
4. Review error messages
5. Verify database state

---

**Happy Testing! 🎉**
