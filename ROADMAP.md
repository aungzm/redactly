# Redactly Development Roadmap

This document outlines the planned development phases for Redactly, from MVP to feature-complete product.

## Development Philosophy

- **Iterative Development**: Ship working software early and often
- **User Feedback**: Incorporate feedback after each phase
- **Quality Over Speed**: Ensure each phase is stable before moving forward
- **Open Source**: Community contributions welcome at all stages

## Phase 1: MVP (v0.1.0) - Foundation

**Goal**: Prove the core concept with minimal features

### Features
- [x] Documentation complete
- [ ] Extension manifest V3 setup
- [ ] Basic storage system (`chrome.storage.local`)
- [ ] Single AI site support (ChatGPT only)
- [ ] Exact match rules only
- [ ] Basic redaction engine
- [ ] Clipboard un-redaction
- [ ] Simple popup UI (enable/disable)
- [ ] Basic options page (add/edit/delete rules)

### Technical Tasks
- [ ] Set up project structure
- [ ] Implement storage layer
- [ ] Create redaction engine core
- [ ] Build ChatGPT content script
- [ ] Implement clipboard interception
- [ ] Design and build popup UI
- [ ] Design and build options page
- [ ] Manual testing on ChatGPT

### Success Criteria
- ✅ Can add exact-match rules via options page
- ✅ Rules apply to ChatGPT inputs before submission
- ✅ Copying text from ChatGPT responses un-redacts properly
- ✅ No console errors during normal usage
- ✅ Extension loads and runs in Chrome

---

## Phase 2: Multi-Site Support (v0.2.0)

**Goal**: Expand to support all planned AI services

### Features
- [ ] Claude.ai support
- [ ] DeepSeek support
- [ ] Per-site enable/disable toggle
- [ ] Site settings management in options page
- [ ] Improved popup with site-specific status

### Technical Tasks
- [ ] Analyze Claude.ai DOM structure
- [ ] Build Claude content script
- [ ] Analyze DeepSeek DOM structure
- [ ] Build DeepSeek content script
- [ ] Implement site detection in background worker
- [ ] Create site settings UI
- [ ] Update popup to show current site status
- [ ] Cross-site testing

### Success Criteria
- ✅ All three AI sites supported
- ✅ Can independently enable/disable each site
- ✅ Redaction works consistently across all sites
- ✅ Clipboard un-redaction works on all sites

---

## Phase 3: Advanced Rules (v0.3.0)

**Goal**: Support pattern matching and regex rules

### Features
- [ ] Pattern matching support (wildcards)
- [ ] Full regex support
- [ ] Rule type selector (exact/pattern/regex)
- [ ] Case sensitivity toggle
- [ ] Rule testing interface in options page
- [ ] Regex validation and error messages

### Technical Tasks
- [ ] Extend redaction engine for pattern matching
- [ ] Implement regex rule processing
- [ ] Add regex validation
- [ ] Build rule testing UI component
- [ ] Update rule creation form with type selection
- [ ] Add case sensitivity option
- [ ] Performance optimization for regex rules
- [ ] Testing with complex regex patterns

### Success Criteria
- ✅ Pattern rules work (e.g., `*.example.com`)
- ✅ Regex rules work properly
- ✅ Invalid regex patterns show helpful errors
- ✅ Rule tester shows live preview
- ✅ No ReDoS vulnerabilities

---

## Phase 4: User Experience (v0.4.0)

**Goal**: Polish the UI and improve usability

### Features
- [ ] Visual highlighting of redacted text (optional)
- [ ] Improved rule management UI
  - [ ] Search/filter rules
  - [ ] Bulk enable/disable
  - [ ] Rule categories/tags
- [ ] Better error handling and user feedback
- [ ] Onboarding tutorial for new users
- [ ] Keyboard shortcuts
- [ ] Dark mode support

### Technical Tasks
- [ ] Implement text highlighting in content scripts
- [ ] Build advanced rule management features
- [ ] Create onboarding flow
- [ ] Add keyboard shortcut handling
- [ ] Design and implement dark mode
- [ ] Improve error messages throughout
- [ ] Add loading states and animations
- [ ] Accessibility improvements (a11y)

### Success Criteria
- ✅ Users can see what was redacted (if enabled)
- ✅ Rule management is intuitive and fast
- ✅ New users understand how to use the extension
- ✅ Keyboard shortcuts work as expected
- ✅ UI is accessible and responsive

---

## Phase 5: Security & Privacy (v0.5.0)

**Goal**: Add optional encryption and enhance security

### Features
- [ ] Optional encryption for stored rules
- [ ] Master password/passphrase
- [ ] Auto-lock after inactivity
- [ ] Security audit of all code
- [ ] Privacy policy and security documentation

### Technical Tasks
- [ ] Implement Web Crypto API encryption
- [ ] Build password/passphrase UI
- [ ] Add encryption toggle in settings
- [ ] Implement auto-lock mechanism
- [ ] Conduct security audit
- [ ] Add CSP hardening
- [ ] Documentation updates
- [ ] Penetration testing

### Success Criteria
- ✅ Users can encrypt rules with password
- ✅ Extension locks after configured inactivity
- ✅ No security vulnerabilities found in audit
- ✅ Clear security documentation available

---

## Phase 6: Import/Export & Sync (v0.6.0)

**Goal**: Allow users to backup and share rule sets

### Features
- [ ] Export rules to JSON
- [ ] Import rules from JSON
- [ ] Rule set templates
- [ ] Backup/restore all settings
- [ ] Optional cloud sync (encrypted)

### Technical Tasks
- [ ] Build import/export functionality
- [ ] Create rule set template library
- [ ] Design import/export UI
- [ ] Implement backup system
- [ ] (Optional) Build encrypted sync service
- [ ] Handle import conflicts/merging
- [ ] Validation for imported data

### Success Criteria
- ✅ Can export all rules to file
- ✅ Can import rules from file
- ✅ Templates available for common use cases
- ✅ Full backup/restore works correctly

---

## Phase 7: Polish & Release (v1.0.0)

**Goal**: Prepare for public release on Chrome Web Store

### Features
- [ ] Complete documentation
- [ ] Comprehensive testing
- [ ] Performance optimization
- [ ] Browser compatibility testing
- [ ] Store listing preparation

### Technical Tasks
- [ ] Final bug fixes
- [ ] Performance profiling and optimization
- [ ] Cross-browser testing (Chrome, Edge, Brave)
- [ ] Create demo video
- [ ] Prepare Chrome Web Store assets
  - [ ] Screenshots
  - [ ] Promotional images
  - [ ] Store description
- [ ] Legal review (privacy policy, terms)
- [ ] Submit to Chrome Web Store

### Success Criteria
- ✅ All known bugs fixed
- ✅ Performance is acceptable (<50ms redaction time)
- ✅ Works on all target browsers
- ✅ Documentation is complete
- ✅ Listed on Chrome Web Store

---

## Post-Release: Future Enhancements

These features are not planned for v1.0 but may be added based on user feedback:

### Potential Features
- Firefox support (Manifest V2/V3)
- Safari extension
- Advanced redaction modes
  - Context-aware redaction
  - AI-powered sensitive data detection
- Rule sharing community
- Redaction statistics/analytics (local only)
- Multiple placeholder formats
- Custom placeholder templates
- Integration with password managers
- Browser sync across devices
- Mobile browser support

### Community Contributions
- Translation/internationalization (i18n)
- Custom themes
- Additional AI site support
- Plugin system for extensibility

---

## Version Naming Convention

- **v0.x.x**: Pre-release/beta versions
- **v1.0.0**: First stable public release
- **v1.x.x**: Minor updates and features
- **v2.0.0**: Major architecture changes or breaking changes

## Development Notes

Each phase is designed to deliver meaningful value and can be completed independently. The timeline for each phase will vary based on:
- Available development time
- Complexity of the features
- Community contributions
- Testing and debugging needs

Phases can be reordered or merged based on priorities and feedback.

---

## How to Contribute

See [CONTRIBUTING.md](./CONTRIBUTING.md) for details on:
- Development setup
- Coding standards
- Testing requirements
- Pull request process
- How to pick tasks from the roadmap

---

## Feedback & Suggestions

Have ideas for features not listed here? Please:
1. Open a GitHub Discussion
2. Create a feature request issue
3. Join the community discussion

Your feedback shapes the roadmap!
