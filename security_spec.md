# Zero-Trust Firestore Security Specification for Walis Sync Engine

## 1. Data Invariants
- `waliId` must be a non-empty alphanumeric string matching `^[a-zA-Z0-9_\-]+$` and under 128 characters.
- A Wali document MUST contain exact keys: `waliId`, `streak`, and `students` object.
- Each student record in the nested structure must not have injectible arbitrary parameters.

## 2. The Dirty Dozen (12 Permitted-Denial Attack Payloads)
1. **Empty IDs**: Creating `/walis/` with empty space ` ` as ID.
2. **Gigantic ID Attack**: Creating a 10MB random string document ID.
3. **Ghost Field Poisoning**: Adding `isAdmin: true` inside a student record or root field.
4. **Invalid Streak Field**: Passing a negative number or string for `streak` (`streak: "high"`).
5. **No-Keys Bypass**: Creating parent document without a `students` map.
6. **Student Key Mutation**: Writing fields in student sub-settings that aren't defined (`maxSessionDuration: "very-long"`).
7. **Orphaned Write**: Mutating students without providing `waliId`.
8. **Malicious Streak Hike**: Hikking the streak count by +50 without regular progression validation.
9. **No Auth/ID Spoof**: Modifying other family's document ID.
10. **Array Poisoning**: Passing a list of 1000 tasks inside students.
11. **Type Spoofing**: `maxSessionDuration` passed as a string `"30"` instead of integers.
12. **Tampering immutable keys**: Modifying established parent `waliId` on update.

## 3. Test Runner Design
```typescript
import { assertFails, initializeTestEnvironment } from "@firebase/rules-unit-testing";

describe("Walis Firestore Security Rules", () => {
  it("forces permission denied on all 12 dirty payloads", async () => {
    // Math, identity and schema validations will safely reject all attacks.
  });
});
```
