**CampusVote**

Test Plan & Results

Project Deliverable 5

Group Members: NeVaeh Dabney-Rich, Jordan Daniels, Adeiyi Olajide, Kyra Evans, Munso Bwalya

Course: CSCI 487  –  Software Design & Development

Professor: Dr. Muhammad Haris Rais

Due Date: April 22, 2026

Team: Trojan Force  |  Virginia State University

# **1\. Overview**

This document presents the test plan and results for CampusVote, a web-based student government election platform developed for Virginia State University. Testing was conducted to verify that all implemented features perform as expected across functional, edge case, and error scenarios. The test cases below cover the three implemented feature areas: Login & Authentication, Election Results & Data Visualization, and Admin Functions.

# **2\. Test Case Rationale**

Test cases were selected to ensure comprehensive coverage of the following categories:

Login & Authentication (TC-01 to TC-06): These test cases validate the core security layer of CampusVote. Ensuring only verified VSU students and admins can access the platform is critical to election integrity.

Results & Data Visualization (TC-07 to TC-11): These cases verify that election outcomes are accurately captured, rendered, and displayed to all users. Edge cases such as zero votes and live updates are included to test robustness.

Admin Functions (TC-12 to TC-15): These cases confirm that administrative controls are both functional and properly secured. This includes election creation, access controls, and prevention of unauthorized modifications.

# **3\. Test Results**

The following table documents the execution of all 15 test cases against the CampusVote application:

| Test Case ID | Description | Input | Expected Output | Actual Output | Pass/Fail | Remarks |
| ----- | ----- | ----- | ----- | ----- | :---: | ----- |
| TC-01 | Valid student login with correct credentials | Valid VSU email & correct password | Dashboard loads successfully | Dashboard loaded | **Pass** | Core login flow works as expected |
| TC-02 | Login with incorrect password | Valid email, wrong password | Error message: Invalid credentials | Error message displayed | **Pass** | System correctly rejects bad password |
| TC-03 | Login with unregistered email | Non-existent email address | Error: Account not found | Error displayed | **Pass** | Unregistered users cannot access system |
| TC-04 | Login with empty username and password fields | Empty email and password fields | Validation error: Fields required | Validation error shown | **Pass** | Form validation prevents empty submission |
| TC-05 | Admin login with admin credentials | Admin email & admin password | Admin dashboard loads with elevated controls | Admin dashboard loaded | **Pass** | Role-based access working correctly |
| TC-06 | Student session logout | Authenticated student clicks logout | User is logged out and redirected to login page | Redirected to login page | **Pass** | Session terminated on logout |
| TC-07 | View election results page after polls close | Navigate to results page post-election | Results page displays vote counts per candidate | Results displayed correctly | **Pass** | Results render after election end |
| TC-08 | Results displayed as charts/graphs | Election with multiple candidates and votes | Bar or pie chart renders with correct data | Chart rendered | **Pass** | Data visualization working |
| TC-09 | Results page with zero votes cast | Closed election with no votes submitted | Page displays 0 votes with empty chart state | Zero state displayed | **Pass** | Edge case: empty election handled gracefully |
| TC-10 | Real-time results update after new vote | New vote submitted during active election | Results refresh to reflect latest vote count | Results updated | **Pass** | Live update functionality verified |
| TC-11 | Results page accessible by non-admin student | Student (non-admin) navigates to results page | Student can view results but not modify them | Read-only view shown | **Pass** | Permissions enforced on results page |
| TC-12 | Admin creates a new election | Admin fills out election form and submits | New election saved and visible in election list | Election created successfully | **Pass** | Admin creation flow works end to end |
| TC-13 | Admin attempts to delete active election | Admin clicks delete on a currently active election | System prevents deletion with warning message | Warning shown, deletion blocked | **Pass** | Active election protection working |
| TC-14 | Admin views all submitted votes (results tracker) | Admin navigates to results tracker in dashboard | Full vote log visible in admin dashboard | Vote log displayed | **Pass** | Admin results tracker accessible |
| TC-15 | Non-admin student attempts to access admin dashboard | Student manually navigates to /admin URL | Access denied; redirected to student dashboard | Access denied and redirected | **Pass** | Unauthorized access correctly blocked |

# **4\. Test Summary**

**Total Test Cases: 15     |     Passed: 15     |     Failed: 0**

All 15 test cases passed successfully. The implemented features — Login & Authentication, Election Results, and Admin Functions — performed as expected across functional scenarios, edge cases, and access control checks. No critical defects were identified during this testing phase.