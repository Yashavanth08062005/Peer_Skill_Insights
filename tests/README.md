# Selenium Test Suite - Peer Skill Insights

## 📋 Overview

This test suite contains automated Selenium tests for the Peer Skill Insights System. It tests critical functionalities including login, registration, and skill/company management.

## 🧪 Test Files

### 1. `test_login.py`

Tests login and registration functionality:

- ✅ Register New User flow
- ✅ Login with invalid credentials (negative test)
- (Login success is implicitly tested during registration)

### 2. `test_skill_management.py`

Tests core application features:

- ✅ Add new Skill and Company
- ✅ Remove existing Skill
- ✅ Verify UI updates are reflected in the DOM

### 3. `run_all_tests.py`

Master test runner that executes all test suites and provides a comprehensive report.

## 🔧 Prerequisites

1. **Python 3.x** installed
2. **Selenium** package:
   ```bash
   pip install selenium
   ```
3. **ChromeDriver** must be installed and in PATH.
4. **Running Application**:
   - Frontend server running on default Vite port: `http://localhost:5173` (or update `base_url` in test files)
   - Backend API running (referenced by Frontend)

## 🚀 How to Run Tests

### Run All Tests:

```bash
cd tests
python run_all_tests.py
```

### Run Individual Test Files:

```bash
python test_login.py
python test_skill_management.py
```

## 📊 Test Output

The tests will output detailed information including:
- Each step being performed
- Success/failure status
- Current URL after actions
- Error messages if any
- Final summary with pass/fail counts

## 🔑 Test Strategy

Tests are designed to be independent where possible, but `test_skill_management` currently registers a new user for each run to ensure a clean state and avoid polluting existing user data.

## 🛠️ Customization

If your application runs on a different port (e.g. 3000):
Change `self.base_url` in the `__init__` method of the test classes.
