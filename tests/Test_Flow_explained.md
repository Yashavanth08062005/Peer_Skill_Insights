# Selenium Test Execution Flow

## 🔄 Test Execution Logic

### Proper User Session Management

Each test suite manages its own user session to ensure reliability:

```
1. SETUP (Register/Login fresh user or Clear LocalStorage)
   ↓
2. Navigate to Application
   ↓
3. Perform test actions
   ↓
4. Verify results
   ↓
5. TEARDOWN (Close browser)
```

## 📋 Test Sequence

### Login Tests (`test_login.py`)

**Test 1: Register Flow**
```
Clear Storage → Register new unique user (timestamped) → Verify "Success" message 
→ Login with new creds → Verify Dashboard/Sidebar appears → ✓
```

**Test 2: Invalid Login**
```
Clear Storage → Try intentional wrong credentials 
→ Verify error message appears OR Sidebar does NOT appear → ✓
```

### Skill Management Tests (`test_skill_management.py`)

**Setup:**
```
Register fresh user "skilltest_{timestamp}" → Login → Verify Sidebar
```

**Test 1: Add Skill/Company**
```
Navigate to "My Skills" → Enter "TestCorp" & "Selenium, Python" 
→ Click Update → Verify text appears in `.tag-list` → ✓
```

**Test 2: Remove Skill**
```
Find existing skill tag (×) → Click it 
→ Verify count of tags decreases → ✓
```

## 🔑 Key Features

### Dynamic User Creation
Instead of relying on a hardcoded `admin/admin` which might be deleted or modified, the tests create new users on the fly. This limits flakiness due to database state changes.

### HTML5 & React Interaction
- Uses `WebDriverWait` for React elements that render asynchronously.
- Uses `localStorage.clear()` to simulate a hard Logout/Reset.
- interact with React Virtual DOM elements by waiting for presence in the actual DOM.

## ⚠️ Troubleshooting

- **Port Mismatch**: If tests fail immediately with connection errors, check `self.base_url`.
- **Element Not Found**: React class names changed? Check `MySkills.jsx` or `App.jsx` for updated class names/IDs.
- **Backend Down**: If Registration fails 500/Network Error, ensure backend is running.
