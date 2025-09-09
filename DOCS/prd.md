# Automated Accounting Office Management Platform - PRD

**Version**: 2.0 Final  
**Date**: September 2025  
**Status**: Ready for Development - Phase 1 Focus

---

## Executive Summary

Building a comprehensive automation platform for Israeli accounting firms that eliminates manual processes and transforms traditional accounting offices into AI-powered, highly efficient operations. The system starts as an internal solution for Tiko Franco's accounting firm and evolves into a white-label SaaS platform for the Israeli accounting industry.

**Critical Mission**: Replace Monday.com, eliminate employee dependency, and automate 90% of routine accounting work by December 2025.

## Vision & Mission

### Vision
Transform Israeli accounting firms from manual, labor-intensive operations into fully automated, efficient businesses that deliver superior service with minimal human intervention.

### Mission Statement
"Replace manual work with intelligent automation, enabling accountants to focus on high-value consulting while the system handles routine operations."

### Tiko's Revolutionary Goal
- **Current**: 546 companies + 10 employees + Monday.com dependency
- **Target**: 750+ companies + 2 people (Tiko & Shani) + full automation
- **Timeline**: December 25, 2025 - Fee letters MUST be automated

---

## Problem Statement

### Current Pain Points in Tiko's Office:
- **Manual fee collection**: Tedious process of calculating, sending letters, and chasing payments
- **Employee dependency**: Heavy reliance on employees for routine tasks that should be automated
- **Monday.com limitations**: Expensive (₪thousands/month), generic tool that doesn't fit accounting workflows
- **Manual deadline tracking**: Missing tax deadlines due to lack of automated reminders
- **Inefficient communication**: Repetitive client communications handled manually
- **No business intelligence**: Lack of real-time insights into office performance

### Industry-Wide Problems:
- 70% of Israeli accounting firms still use Excel spreadsheets for fee management
- Massive inefficiencies in routine tax and accounting processes
- High employee costs with low-value manual work
- No specialized automation tools for Israeli tax requirements

---

## Solution Overview

### Core Philosophy: "Automation First"
Every manual process in the accounting office will be identified, mapped, and automated through intelligent workflows and template systems.

### Primary Goals:
1. **Eliminate repetitive manual work** - Focus human effort on high-value tasks
2. **Automate fee collection** - Intelligent billing and aggressive collection workflows
3. **Replace Monday.com** - Custom CRM tailored for accounting workflows  
4. **Template-driven documents** - Professional letters from Shani & Tiko templates
5. **Real-time business intelligence** - Live dashboards for office performance
6. **Scalable platform** - Multi-tenant foundation for white-label expansion

---

## Product Architecture

### System Core: "The Office Brain"
Central database built around the **fee budget file** containing:
- Complete client database with payment history
- Automated fee calculation engine
- 11 letter templates from Shani & Tiko (ready-made)
- Integrated Cardcom payment processing
- Real-time collection tracking

### Three-Layer Architecture:

#### Layer 1: Internal Operations (Phase 1 - December 2025)
- Fee management system with automated calculations
- Letter template system (NO AI generation - templates from Shani & Tiko)
- Client communication automation
- Cardcom payment integration
- Real-time revenue dashboard

#### Layer 2: Advanced Integration (Phase 2 - Q1-Q2 2026)  
- חשבשבת API integration for accounting data
- Advanced business analytics and reporting
- Client portal with financial data access
- Enhanced workflow automation

#### Layer 3: Commercial Platform (Phase 3 - Q3-Q4 2026)
- White-label SaaS for other accounting firms
- Pay-per-click usage model
- Virtual office rental for independent accountants
- Consulting marketplace

---

## User Management & Authentication

### User Roles System
The platform supports four distinct user roles with granular permissions:

#### Role Hierarchy:
1. **Admin** - Full system access, user management, system configuration
2. **Accountant** - Full access to accounting modules, client management
3. **Bookkeeper** - Limited access to data entry and basic reporting
4. **Client** - Access only to their own data and reports (Phase 2)

#### Authentication Flow:
1. **Supabase Auth**: Email/password + Google/Microsoft OAuth (ALREADY CONFIGURED)
2. **Initial Setup**: First registered user automatically becomes admin
3. **Registration Process**: New users register but require admin approval
4. **Permission Management**: Admins can customize permissions per user/role
5. **Module Access Control**: Users see only modules they have access to

#### Audit Logging:
Every action in the system is logged with:
- User identification and role
- Action performed and module accessed
- Timestamp and IP address
- Resource affected (client, document, etc.)
- Detailed action context for compliance

---

## Development Phases

### 🎯 Phase 1: Fee Management Revolution (Target: December 25, 2025)
**CRITICAL DEADLINE**: Fee letters MUST be sent automatically by December 25, 2025

#### Core Features:
**1. Intelligent Fee Calculation System**
- Import previous year's payments from existing Monday.com data
- Automated fee adjustment algorithms (inflation, real increases, discounts)
- Automatic client categorization for appropriate fee structures
- Integration with current systems during transition period

**2. Letter Template System (11 Templates from Shani & Tiko)**
- **Pre-made templates**: Shani & Tiko provide 11 completed letter templates
- **Variable replacement**: Simple system replaces {{client_name}}, {{amount}}, {{date}}
- **Template selection logic**: Automated choice based on fee type, client status
- **NO AI generation needed** - professional templates already created
- **Hebrew formatting**: Proper RTL layout and Israeli business correspondence

**3. Cardcom Payment Integration**
- **Payment Gateway**: Cardcom (Israeli market leader)
- Credit card payment links embedded in letters
- Bank transfer automation options
- Payment tracking and automatic confirmation
- Receipt generation in Hebrew and English

**4. Aggressive Collection Workflows**
- "No payment = No progress" policy enforcement
- Automated monthly reminders to non-payers
- Escalating letter sequences (gentle → firm → legal)
- Service suspension triggers for non-payment
- Real-time payment status tracking

**5. Real-Time Revenue Dashboard**
- Live budget tracking vs. actual collections
- Client payment status overview (paid/pending/overdue)
- Collection effectiveness metrics and trends
- Revenue forecasting based on historical data
- Monthly/yearly comparison views

#### Success Metrics:
- ✅ 100% of fee letters generated automatically by December 25, 2025
- ✅ 90% reduction in manual fee collection work
- ✅ Real-time visibility into office revenue status
- ✅ Multi-tenant foundation ready for Phase 2 expansion

### 🚀 Phase 2: חשבשבת Integration & Advanced Analytics (Q1-Q2 2026)

#### Core Features:
**1. חשבשבת API Integration**
- Client data synchronization with accounting software
- Financial reports import (Profit & Loss statements)
- Balance sheet data with real-time updates
- Automated data validation and error checking

**2. Client Portal System**
- **Separate authentication** for client access
- Interactive financial data presentations
- Real-time business metrics and dashboards
- Mobile-responsive design for on-the-go access

**3. Advanced Analytics & Reporting**
- Automated financial statement analysis
- Business trend identification and alerts
- Multi-year comparison reports
- Client-specific insights and recommendations

#### Success Metrics:
- ✅ 95% of routine data imports automated
- ✅ Zero missed deadlines due to system oversight
- ✅ 80% reduction in client inquiry handling time
- ✅ Client satisfaction maintained or improved

### 🌍 Phase 3: White-Label Platform & Market Expansion (Q3-Q4 2026)

#### Core Features:
**1. Multi-Tenant White-Label Platform**
- Complete branding customization for partner firms
- Isolated data environments with perfect tenant separation
- Scalable infrastructure for 100+ accounting offices
- Self-service onboarding and setup wizards

**2. Pay-Per-Click Revenue Model**
- Usage-based pricing for all system functions
- Automated billing and revenue sharing
- Tiered service packages for different firm sizes
- Real-time usage analytics and cost optimization

**3. Virtual Accounting Office Rental**
- Complete office infrastructure for independent accountants
- Access to professional letter templates and workflows
- Shared resources and best practice knowledge base
- Revenue sharing for consulting referrals

#### Success Metrics:
- ✅ 10+ accounting firms using the platform
- ✅ ₪100K+ monthly recurring revenue from platform
- ✅ Market recognition as leading accounting automation platform

---

## Technical Requirements

### Core Technology Stack (LOCKED)
```yaml
Frontend: React 19 + Vite + TypeScript (strict mode)
UI Library: shadcn/ui + Tailwind CSS (NO other UI libraries)
Backend: Supabase (Database + Auth + Real-time + Storage)
State Management: Zustand (no Redux)
Payment Processing: Cardcom (Israeli gateway)
Testing: Vitest (unit) + Playwright (E2E)
```

### Israeli Market Requirements
- **Language**: Hebrew primary, English secondary
- **Layout**: RTL (Right-to-Left) support with Tailwind CSS
- **Currency**: ILS (₪) formatting - ₪1,234.56
- **Date Format**: DD/MM/YYYY (Israeli standard)
- **Tax ID**: 9-digit Israeli tax ID validation with check digit
- **Typography**: Hebrew fonts (Assistant/Heebo)
- **Business Culture**: Professional Hebrew correspondence standards

### Key Integrations:
1. **Cardcom Payment Gateway** - Israeli credit card processing
2. **חשבשבת API** - Accounting software data synchronization (Phase 2)
3. **Email/SMS Providers** - Multi-channel communication
4. **Supabase Real-time** - Live dashboard updates

### Performance Requirements:
- **Response Time**: < 2 seconds for all user interactions
- **Uptime**: 99.9% availability during Israeli business hours
- **Scalability**: Support for 10,000+ clients with multi-tenant architecture
- **Security**: Row Level Security (RLS) for perfect tenant isolation

---

## Letter Template System (No AI Required)

### How It Works:
1. **Shani & Tiko create 11 professional letter templates** (HTML format)
2. **System replaces variables**: {{client_name}}, {{amount}}, {{due_date}}
3. **Automatic template selection**: Based on fee type, amount, client status
4. **Cardcom payment links**: Automatically embedded in letters
5. **Multi-format output**: Email, PDF, print-ready versions

### Template Variables:
```typescript
interface LetterVariables {
  client_name: string;           // "חברת ABC בע״מ"
  company_name: string;          // "ABC Company Ltd"
  amount: string;                // "₪1,234.56"
  due_date: string;              // "31/12/2025"
  contact_name: string;          // "יוסי כהן"
  previous_amount?: string;      // For comparison letters
  adjustment_reason?: string;    // For fee increase explanations
  payment_link: string;          // Cardcom payment URL
}
```

### Template Types (11 from Shani & Tiko):
1. Annual fee notification
2. Fee increase with inflation adjustment
3. Fee increase with real increase
4. Payment reminder (gentle)
5. Payment reminder (firm)
6. Payment overdue notice
7. Service suspension warning
8. Payment confirmation
9. New client welcome
10. Service completion notification
11. Custom consultation letter

---

## Revenue Model

### Phase 1 (Internal Use - 2025):
- **ROI Focus**: Cost savings from eliminated manual work
- **Efficiency Gains**: 10x faster fee collection process
- **Cost Reduction**: Eliminate 3-5 manual processing roles
- **Monday.com Savings**: ₪thousands per month

### Phase 2 (Early Expansion - 2026):
- **Pilot Programs**: 2-3 partner firms at discounted rates
- **Proof of Concept**: Demonstrate clear ROI for market validation
- **Feature Refinement**: Based on multi-firm usage patterns

### Phase 3 (Commercial Platform - 2026+):
- **SaaS Subscriptions**: ₪500-2000/month per firm based on size
- **Pay-Per-Click**: ₪1-30 per automated action/document
- **Virtual Office Rental**: ₪300-800/month for independent accountants
- **Consulting Revenue**: 20% commission on expert services

### Revenue Projections:
- **Year 1**: ₪200K (internal savings + early pilots)
- **Year 2**: ₪2M (20 partner firms + virtual offices)
- **Year 3**: ₪10M (100+ firms + marketplace revenue)

---

## User Personas & Workflows

### Primary Users (Internal):

#### Tiko Franco - Office Owner & Visionary
**Goals**: Eliminate employee dependencies, maximize efficiency, maintain control
**Key Workflows**:
- Real-time revenue dashboard monitoring
- Strategic fee adjustment decisions through system
- Client relationship oversight via automated communications
- System performance analysis and optimization

#### Shani Tiko - Office Manager & Operations Lead
**Goals**: Streamline operations, reduce manual workload, improve client service
**Key Workflows**:
- Daily automation management and monitoring
- Template management and customization
- Client communication oversight and quality control
- Deadline tracking and compliance management

### Secondary Users (Future):

#### Partner Accounting Firms (Phase 3)
**Goals**: Access to advanced automation without development costs
**Key Workflows**:
- System setup and branding customization
- Client onboarding and data migration
- Service utilization optimization
- Performance monitoring and ROI tracking

#### Independent Accountants (Phase 3)
**Goals**: Professional infrastructure without overhead costs
**Key Workflows**:
- Virtual office setup and professional branding
- Client service delivery through platform
- Expert consultation requests and fulfillment
- Revenue tracking and business growth

---

## Risk Management

### Technical Risks:
- **Integration Complexity**: Cardcom API changes or limitations
- **Data Migration**: Complex transition from Monday.com systems
- **Performance Issues**: Scaling challenges with multi-tenant architecture

**Mitigation**: Phased rollout, extensive testing, fallback procedures

### Business Risks:
- **Regulatory Changes**: Israeli tax law modifications affecting workflows
- **Market Competition**: Larger players entering the accounting automation space
- **Client Adoption**: Resistance to automation from traditional accounting firms

**Mitigation**: Regulatory monitoring, unique value proposition, change management support

### Operational Risks:
- **System Downtime**: Business-critical system failures during tax season
- **Data Security**: Breach of sensitive financial information
- **Key Personnel**: Dependency on development and business teams

**Mitigation**: Redundant systems, security audits, knowledge documentation

---

## Success Metrics & KPIs

### Phase 1 Targets (December 2025):
- **Automation Rate**: 95% of fee letters automated
- **Processing Time**: 80% reduction in fee collection cycle
- **Revenue Visibility**: Real-time dashboard with 100% accuracy
- **Client Satisfaction**: Maintained or improved despite automation
- **Cost Savings**: Eliminate ₪300K+ in manual processing costs

### Platform-Wide Goals (2026):
- **Market Penetration**: 5% of Israeli accounting firms using the platform
- **User Efficiency**: 70% average reduction in manual work for users
- **Revenue Growth**: ₪10M+ annual recurring revenue
- **Industry Recognition**: Thought leadership in accounting automation

### Long-Term Vision (2027+):
- **Market Leadership**: #1 accounting automation platform in Israel
- **International Expansion**: Launch in 2+ additional countries
- **Full Automation**: 90% of routine accounting operations automated
- **Industry Transformation**: Standard platform for modern accounting firms

---

## Israeli Market Strategy

### Target Market Analysis:
- **Market Size**: 15,000+ accounting firms in Israel
- **Technology Gap**: 70% still use Excel spreadsheets for fee management
- **Average Firm**: 2-8 employees, ₪500K-₪5M annual revenue
- **Pain Points**: Manual processes, employee dependency, no automation tools

### Competitive Advantage:
- **Hebrew-native**: Built for Hebrew business communication from day one
- **חשבשבת Integration**: Direct connection to Israeli accounting software
- **Cardcom Payment**: Native integration with leading Israeli gateway
- **Local Business Culture**: Deep understanding of Israeli accounting practices
- **Professional Templates**: Business-ready letters from experienced accountants

### Market Entry Strategy:
- **Phase 1**: Prove concept with Tiko's firm (internal validation)
- **Phase 2**: 3-5 pilot firms in Tel Aviv area (market validation)
- **Phase 3**: National rollout with partner channel strategy
- **International**: Expand to similar markets (Europe, Australia)

---

## Next Steps & Development Roadmap

### Immediate Actions (October 2025):
1. **Final Requirements Gathering**: Deep dive sessions with Tiko and Shani
2. **Template Collection**: Gather and digitize 11 letter templates
3. **Cardcom Integration Setup**: API credentials and testing environment
4. **UI/UX Design Sprint**: Hebrew RTL workflow mockups

### Critical Milestones:
- **October 15, 2025**: Core fee calculation engine completed
- **November 15, 2025**: Letter template system functional
- **December 1, 2025**: Cardcom payment integration tested
- **December 25, 2025**: Full Phase 1 system operational (CRITICAL)
- **February 2026**: First partner firm pilot launch
- **June 2026**: White-label platform beta release

### Development Sprint Schedule:
**Sprint 1 (Oct 1-15)**: Core database schema + authentication
**Sprint 2 (Oct 16-31)**: Fee calculation engine + client management
**Sprint 3 (Nov 1-15)**: Letter template system + variable replacement
**Sprint 4 (Nov 16-30)**: Cardcom integration + payment tracking
**Sprint 5 (Dec 1-15)**: Dashboard + real-time updates
**Sprint 6 (Dec 16-25)**: Final testing + production deployment

---

## Quality Assurance & Testing

### Testing Strategy:
```yaml
Unit Testing: Vitest (80%+ coverage for business logic)
E2E Testing: Playwright (critical user flows)
Hebrew/RTL Testing: Specific test cases for Israeli market
Security Testing: RLS policies and tenant isolation
Performance Testing: 10,000+ clients simulation
User Acceptance Testing: Tiko & Shani validation
```

### Pre-Launch Checklist:
- [ ] All 11 letter templates tested with real client data
- [ ] Cardcom payment flow tested end-to-end
- [ ] Hebrew RTL layout validated on all browsers
- [ ] Multi-tenant isolation confirmed with security audit
- [ ] Performance benchmarks met for 700+ clients
- [ ] Backup and recovery procedures tested
- [ ] Production monitoring and alerting configured

---

**Document Status**: This PRD represents the final requirements for Phase 1 development. All major features and technical decisions have been finalized. Changes require approval from Asaf and alignment with the December 25, 2025 deadline.

**Last Updated**: September 2025  
**Next Review**: Weekly during Phase 1 development