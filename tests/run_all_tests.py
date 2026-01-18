
from test_login import TestLogin
from test_skill_management import TestSkillManagement
from test_dashboard import TestDashboard
from test_peers import TestPeers
from test_profile import TestProfile
from test_navigation import TestNavigation
import time

def main():
    print("\n" + "="*80)
    print(" " * 20 + "PEER SKILL INSIGHTS SYSTEM")
    print(" " * 25 + "SELENIUM TEST SUITE")
    print("="*80)
    
    all_results = {}
    
    # Test 1: Login Functionality (Standalone)
    print("\n\n[1/5] Running Login Tests...")
    print("-" * 80)
    login_test = TestLogin()
    try:
        login_results = login_test.run_all_tests()
        all_results["Login Tests"] = login_results
    finally:
        login_test.close()
    
    time.sleep(2)
    
    # Test 2: Skill Management (Uses authenticated session)
    # We will use this session for the subsequent tests to be faster
    print("\n\n[2/5] Running Skill Management Tests (and initializing session)...")
    print("-" * 80)
    skill_test = TestSkillManagement()
    
    try:
        if not skill_test.setup_user():
             print("CRITICAL: Failed to setup authenticated session.")
             return
             
        # Run Skill Tests
        skill_results = {}
        skill_results["Add Skill"] = skill_test.test_add_skill()
        skill_results["Remove Skill"] = skill_test.test_remove_skill()
        
        all_results["Skill Management Tests"] = skill_results
        
        # Share driver
        driver = skill_test.driver
        
        # Test 3: Dashboard
        print("\n\n[3/5] Running Dashboard Tests...")
        all_results["Dashboard Tests"] = {
            "Visibility": TestDashboard(driver).test_dashboard_elements()
        }
        
        # Test 5: Peers
        print("\n\n[4/5] Running Peer Tests...")
        all_results["Peer Tests"] = {
             "Page Structure": TestPeers(driver).test_peers_page()
        }
        
        # Test 6: Navigation
        print("\n\n[5/5] Running Navigation Tests...")
        all_results["Navigation Tests"] = {
             "Flow": TestNavigation(driver).test_navigation_flow()
        }
        
    finally:
        skill_test.close()
    
    # Final Summary
    print("\n\n" + "="*80)
    print(" " * 30 + "FINAL TEST REPORT")
    print("="*80)
    
    total_passed = 0
    total_tests = 0
    
    for category, tests in all_results.items():
        print(f"\n{category}:")
        if tests:
            for test_name, result in tests.items():
                status = "✅ PASSED" if result else "❌ FAILED"
                print(f"  {test_name}: {status}")
                if result:
                    total_passed += 1
                total_tests += 1
        else:
            print("  ⚠ No tests run or setup failed.")
    
    print("\n" + "="*80)
    pass_rate = (total_passed / total_tests * 100) if total_tests > 0 else 0
    print(f"TOTAL RESULTS: {total_passed}/{total_tests} tests passed ({pass_rate:.1f}%)")
    print("="*80)
    
    if total_passed == total_tests and total_tests > 0:
        print("\n🎉 ALL TESTS PASSED! 🎉")
    elif total_passed >= total_tests * 0.8:
        print("\n✅ Most tests passed - Good!")
    elif total_passed >= total_tests * 0.5:
        print("\n⚠️  Some tests failed - Needs attention")
    else:
        print("\n❌ Many tests failed - Requires fixes")
    
    print("\n")

if __name__ == "__main__":
    main()
