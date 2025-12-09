# תוכנית יישום: בחירת קבוצה בדף תבניות מכתבים

## סיכום המצב הקיים

### דף תבניות מכתבים (`UniversalLetterBuilder.tsx`)
כרגע יש שני מצבים:
1. **לקוח מהרשימה** (`client`) - בחירת לקוח בודד מרשימת הלקוחות
2. **נמען אחר** (`manual`) - הזנה ידנית של שם נמען ומיילים

### מימוש קבוצות בדף שכר טרחה (`FeesPage.tsx`)
- משתמש ב-`GroupClientSelector` לבחירת קבוצה
- משתמש ב-`GroupMembersList` להצגת חברות הקבוצה
- איסוף מיילים מכל חברות הקבוצה
- שימוש בשם הקבוצה במקום שם לקוח
- ה-PDF נשמר לכל הלקוחות בקבוצה

---

## שלבים ליישום

### שלב 1: הרחבת טיפוס המצב
```typescript
// שינוי מ:
const [recipientMode, setRecipientMode] = useState<'client' | 'manual'>('client');

// ל:
const [recipientMode, setRecipientMode] = useState<'client' | 'group' | 'manual'>('client');
```

### שלב 2: הוספת State לקבוצות
```typescript
// State חדש לקבוצות
const [groups, setGroups] = useState<ClientGroup[]>([]);
const [selectedGroup, setSelectedGroup] = useState<ClientGroup | null>(null);
const [isLoadingGroups, setIsLoadingGroups] = useState(false);
const [groupMembers, setGroupMembers] = useState<GroupMemberClient[]>([]);
```

### שלב 3: הוספת פונקציות טעינה
```typescript
// טעינת רשימת קבוצות
const loadGroups = async () => {
  setIsLoadingGroups(true);
  try {
    const { data } = await groupFeeService.getAvailableGroups(new Date().getFullYear());
    if (data) {
      const sorted = data.sort((a, b) =>
        (a.group_name_hebrew || '').localeCompare(b.group_name_hebrew || '', 'he')
      );
      setGroups(sorted);
    }
  } finally {
    setIsLoadingGroups(false);
  }
};

// טעינת פרטי קבוצה כולל איסוף מיילים
const handleGroupChange = async (group: ClientGroup | null) => {
  setSelectedGroup(group);

  if (group) {
    // טעינת פרטי חברות הקבוצה
    const { data: fullGroup } = await groupFeeService.getGroupWithMembers(group.id);
    if (fullGroup?.clients) {
      setGroupMembers(fullGroup.clients);

      // איסוף מיילים מכל חברות הקבוצה
      const allEmails: string[] = [];
      for (const client of fullGroup.clients) {
        const emails = await TenantContactService.getClientEmails(client.id, 'important');
        allEmails.push(...emails);
      }
      const uniqueEmails = [...new Set(allEmails)];
      setSelectedRecipients(uniqueEmails);
    }
  } else {
    setGroupMembers([]);
    setSelectedRecipients([]);
  }
};
```

### שלב 4: עדכון UI - הוספת עמודה שלישית
```tsx
{/* Three-Column Grid */}
<div className="grid grid-cols-3 gap-6">

  {/* RIGHT COLUMN: Client from List */}
  <div onClick={() => handleModeSwitch('client')} ...>
    {/* קיים */}
  </div>

  {/* MIDDLE COLUMN: Group Selection - חדש! */}
  <div
    onClick={() => handleModeSwitch('group')}
    className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
      recipientMode === 'group'
        ? 'border-blue-500 bg-blue-50'
        : 'border-gray-300 bg-gray-100 opacity-60'
    }`}
  >
    <h3 className="text-lg font-semibold mb-4 text-right flex items-center justify-end gap-2">
      <Users className="h-5 w-5" />
      קבוצה
    </h3>

    <div className={recipientMode !== 'group' ? 'pointer-events-none' : ''}>
      {/* Group Selector Combobox */}
      <Combobox
        options={groups.map(g => ({
          value: g.id,
          label: `${g.group_name_hebrew} (${g.member_count || 0} חברות)`
        }))}
        value={selectedGroup?.id}
        onValueChange={(id) => {
          const group = groups.find(g => g.id === id);
          handleGroupChange(group || null);
        }}
        placeholder="בחר קבוצה..."
      />

      {/* Display group members */}
      {selectedGroup && groupMembers.length > 0 && (
        <GroupMembersList
          groupId={selectedGroup.id}
          compact={true}
        />
      )}
    </div>
  </div>

  {/* LEFT COLUMN: Manual Recipient */}
  <div onClick={() => handleModeSwitch('manual')} ...>
    {/* קיים */}
  </div>

</div>
```

### שלב 5: עדכון לוגיקת המשתנים
```typescript
// בכל המקומות שמשתמשים ב-companyName, צריך להוסיף:
const getRecipientName = () => {
  if (recipientMode === 'group' && selectedGroup) {
    return selectedGroup.group_name_hebrew;
  }
  if (recipientMode === 'manual') {
    return manualCompanyName;
  }
  return companyName; // client mode
};

// Variables object:
const variables: Record<string, string | number> = {
  company_name: getRecipientName(),
  group_name: '', // לא רלוונטי במכתב כללי
  commercial_name: showCommercialName ? commercialName : ''
};
```

### שלב 6: עדכון שמירה/שליחה
```typescript
// handleSendEmail - עדכון:
const result = await templateService.generateFromCustomText({
  plainText: letterContent,
  clientId: recipientMode === 'client' ? selectedClient?.id : null,
  groupId: recipientMode === 'group' ? selectedGroup?.id : null, // חדש!
  variables,
  // ...
});

// handleGeneratePDF - עדכון:
// כאשר במצב קבוצה, שמירת ה-PDF לכל הלקוחות בקבוצה
if (recipientMode === 'group' && selectedGroup?.id) {
  await fileUploadService.uploadFileToGroupCategory(
    pdfFile,
    selectedGroup.id,
    'quote_invoice',
    'מכתב כללי'
  );
}
```

### שלב 7: עדכון handleModeSwitch
```typescript
const handleModeSwitch = (newMode: 'client' | 'group' | 'manual') => {
  if (recipientMode === newMode) return;

  const hasClientData = selectedClient !== null || companyName.trim() !== '';
  const hasGroupData = selectedGroup !== null;
  const hasManualData = manualCompanyName.trim() !== '';

  const shouldWarn =
    (recipientMode === 'client' && hasClientData) ||
    (recipientMode === 'group' && hasGroupData) ||
    (recipientMode === 'manual' && hasManualData);

  if (shouldWarn) {
    setPendingMode(newMode);
    setShowModeWarning(true);
  } else {
    setRecipientMode(newMode);
    // Clear all selections
    setSelectedClient(null);
    setSelectedGroup(null);
    setGroupMembers([]);
    setSelectedRecipients([]);
    // ...
  }
};
```

---

## קבצים לעדכון

1. **`src/modules/letters/components/UniversalLetterBuilder.tsx`**
   - הוספת State לקבוצות
   - עדכון טיפוס recipientMode
   - הוספת UI לבחירת קבוצה
   - עדכון לוגיקת משתנים ושליחה

2. **`src/modules/letters/services/template.service.ts`** (אם נדרש)
   - תמיכה ב-groupId בשמירת מכתב

---

## בדיקות נדרשות

1. [ ] בחירת קבוצה מהרשימה
2. [ ] הצגת חברות הקבוצה
3. [ ] איסוף נכון של מיילים מכל החברות
4. [ ] תצוגה מקדימה עם שם הקבוצה
5. [ ] שליחת מייל לכל הנמענים
6. [ ] הורדת PDF
7. [ ] מעבר בין מצבים (client ↔ group ↔ manual)

---

## הערות נוספות

- שימוש חוזר ב-`GroupMembersList` מדף שכר הטרחה (compact mode)
- שימוש חוזר ב-`groupFeeService` לטעינת קבוצות
- שמירה על תאימות לאחור - מצב לקוח ונמען אחר ממשיכים לעבוד כרגיל
