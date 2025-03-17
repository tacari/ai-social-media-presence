# AI Online Presence Manager: Dashboard Design

## Overview

The dashboard serves as the home screen for the AI-powered Online Presence Manager, providing users with a clear snapshot of their online presence across multiple platforms. It is designed to be approachable for non-technical users, avoiding jargon and complex interactions, while offering powerful tools to manage their digital footprint. The layout is divided into three main areas: a **Header Bar**, a **Sidebar** for navigation, and a **Main Content Area** with three key sections: Overview, Platforms, and Action Center. Every element is crafted to balance functionality with simplicity, ensuring users can monitor performance, check platform statuses, and take immediate actions without feeling overwhelmed.

---

## Layout

### 1. Header Bar
The **Header Bar** spans the top of the dashboard, providing branding and essential user controls.

- **Logo**: Positioned on the left, displaying the SaaS branding (e.g., a stylized icon and name). It's clickable to return to the dashboard from any page.
- **Right-Aligned Controls**:
  - **Notifications Icon**: A bell icon with a red badge showing the number of unread notifications (e.g., "3"). Clicking it opens a dropdown with a list of recent alerts (e.g., "New 5-star review received," "Ad campaign ended"), each with a timestamp and a "Mark as Read" option.
  - **Support Button**: A "Help" button (text or question mark icon) that opens a modal or sidebar with links to FAQs, tutorials, and live chat support—crucial for non-tech-savvy users needing assistance.
  - **User Menu**: An avatar or initials circle (e.g., "JD" for John Doe) that, when clicked, reveals a dropdown with:
    - **Account**: Leads to a page for managing profile details and password.
    - **Billing**: Links to subscription details, payment methods, and invoices.
    - **Logout**: Signs the user out.
- **Design**: The header has a clean white background with a subtle bottom border (#E0E0E0) to separate it from the content below. Icons are 24x24 pixels, with hover effects (e.g., slight scale-up) for interactivity.

### 2. Sidebar
The **Sidebar** is a fixed, vertical panel on the left (200px wide), offering navigation to all major features.

- **Navigation Menu**:
  - **Dashboard**: Home icon, returns to the main dashboard view.
  - **Platforms**: Plug icon, shows a detailed page listing all connected platforms.
  - **Social Media**: Share icon, links to a page for managing posts and schedules.
  - **Reviews**: Star icon, leads to a review management interface.
  - **Ads**: Megaphone icon, directs to Google Ads setup and analytics.
  - **Email**: Envelope icon, opens email marketing tools.
  - **Chatbot**: Chat bubble icon, accesses chatbot configuration.
  - **Settings**: Gear icon, manages account and integration settings.
- **Design**: Each menu item includes a 20px icon and a label (e.g., "Dashboard") in Roboto, 14px, regular. The active item is highlighted with the primary color (#007BFF) as a background or left border. Text and icons are left-aligned with 10px padding.
- **Footer Section**: At the bottom, a "Need Help?" label with a button (e.g., "Contact Support") links to the same support resources as the header button, ensuring help is always accessible.
- **Behavior**: The sidebar remains fixed as users scroll through the main content, providing consistent navigation.

### 3. Main Content Area
The **Main Content Area** occupies the remaining space (right of the sidebar) and is divided into three sections: Overview, Platforms, and Action Center.

#### 3.1 Overview Section
This section provides a high-level snapshot of performance metrics.

- **Metric Cards**: A 2x2 grid of four cards displaying:
  - **Total Reach**: Aggregate reach across all platforms (e.g., "12,345").
  - **Engagement Rate**: Combined likes, comments, and shares (e.g., "3.5%").
  - **New Leads**: Leads generated from all sources (e.g., "25").
  - **Average Review Rating**: Mean rating from GMB and other platforms (e.g., "4.8").
  - **Card Design**: Each card is 200x100px, with:
    - Title (Roboto, 14px, regular).
    - Value (Roboto, 24px, bold).
    - Change Indicator (Open Sans, 12px, e.g., "+5%" in green or "-2%" in red).
    - Optional sparkline (a small line graph showing the trend over 7 days).
- **Performance Graph**: Below the cards, a line chart (400x200px) titled "Performance Over Time" shows trends for one or more metrics (e.g., reach, engagement). Users can toggle the time range (7 days, 30 days, 90 days) via buttons above the graph.
- **Placement**: Centered with 20px padding around the section, ensuring a clean separation from other sections.

#### 3.2 Platforms Section
This section displays the status of all integrated platforms.

- **Platform Cards**: A grid of cards (e.g., 3 columns, adjusting based on screen width), one for each platform: GMB, Facebook, Instagram, Twitter, LinkedIn, Google Ads, Email, Chatbot.
  - **Content** (each card, 200x250px):
    - **Logo**: 48x48px platform icon at the top (e.g., GMB's map pin).
    - **Connection Status**: Text like "Connected" (green) or "Disconnected" (red), 14px.
    - **Recent Activity**: A brief update (e.g., "Last post: 2 days ago"), 12px.
    - **Key Metric**: A standout stat (e.g., "5 new followers this week"), 16px, bold.
    - **Button**: "Manage" (blue, #007BFF) links to a detailed page for that platform; "Connect" (gray) appears if not yet integrated.
  - **Behavior**: Cards for unconnected platforms are dimmed slightly (opacity 0.7) with a "Connect" call-to-action.
- **Layout**: Cards are spaced 15px apart, with a "Platforms" heading (Roboto, 18px, bold) above the grid.

#### 3.3 Action Center
This section offers quick access to common tasks.

- **Action Buttons**: A horizontal row of five cards (each 150x100px):
  - **Schedule Post**: Calendar icon, opens a modal for posting to social media.
  - **Respond to Review**: Star icon, opens a modal to view and reply to reviews.
  - **Launch Ad**: Megaphone icon, links to the Ads page.
  - **Email Sequence**: Envelope icon, links to the Email page.
  - **Chatbot Config**: Chat bubble icon, links to the Chatbot page.
  - **Design**: Each card has a 24px icon above a label (Roboto, 14px), with a blue border or background on hover.
- **Modals**: For "Schedule Post" and "Respond to Review":
  - **Schedule Post Modal**: Includes a platform dropdown, text area, date/time picker, and "Schedule" button.
  - **Respond to Review Modal**: Lists recent reviews with a text area for responses and a "Send" button.
- **Placement**: Centered below the Platforms section, with 20px padding.

---

## Visual Design

### Color Scheme
- **Background**: #F5F7FA (light gray-blue) for a clean, airy feel.
- **Cards**: White (#FFFFFF) with a #E0E0E0 border and subtle shadow (0 2px 4px rgba(0,0,0,0.1)) for depth.
- **Primary Accent**: #007BFF (blue) for buttons, highlights, and active states.
- **Status Colors**:
  - Success: #28A745 (green) for positive metrics or connected statuses.
  - Warning: #FFC107 (yellow) for alerts or pending actions.
  - Danger: #DC3545 (red) for negative changes or disconnected platforms.

### Typography
- **Headings**: Roboto, 18px, bold for section titles (e.g., "Overview").
- **Subheadings**: Roboto, 14px, regular for card titles.
- **Body Text**: Open Sans, 12px for details and descriptions.
- **Metric Values**: Roboto, 24px, bold for emphasis on key numbers.

### Icons
- A consistent set (e.g., Font Awesome or Material Icons) is used throughout:
  - Navigation: Home, plug, share, star, megaphone, envelope, chat bubble, gear.
  - Actions: Calendar, star, megaphone, envelope, chat bubble.
  - Platforms: Recognizable logos or icons for GMB, social media, etc.
- Icons are 20-48px, depending on context, with a uniform style (outline or filled).

### Interactivity
- **Hover Effects**: Cards and buttons scale slightly (1.05x) or shift color (e.g., button background to #0056b3) to indicate clickability.
- **Active States**: Sidebar items and buttons use the primary color (#007BFF) to show selection.
- **Transitions**: Smooth 0.2s animations for hover and click effects.

---

## User Experience (UX)

### Simplicity for Non-Tech-Savvy Users
- **Tooltips**: Small "i" icons next to metrics (e.g., "Total Reach") trigger hover text (e.g., "Number of unique users who saw your content"), explaining terms in plain language.
- **Getting Started Guide**: On first login, a modal or prominent banner says, "Welcome! Let's get started by connecting your platforms," with buttons to connect GMB, social media, etc.
- **Dynamic Content**: The dashboard adapts to show only connected platforms, reducing clutter. Unconnected platforms display a "Connect" card instead of metrics.

### Accessibility
- **Contrast**: Colors meet WCAG 2.1 AA standards (e.g., #007BFF on white has a 4.5:1 ratio).
- **Keyboard Navigation**: Tab order follows a logical flow (header → sidebar → main content), with focus indicators (e.g., blue outline).
- **Screen Readers**: Alt text for icons (e.g., "Google My Business logo") and ARIA labels for interactive elements.

### Responsiveness
- **Desktop Focus**: Optimized for 1280x800px screens, with a fixed sidebar and scrollable main content.
- **Tablet/Mobile**: Sidebar collapses into a hamburger menu, and cards stack vertically (to be refined in later iterations).

### Performance
- **Loading States**: Skeleton screens (gray placeholders) animate for metric and platform cards while data loads, ensuring a responsive feel.
- **Real-Time Data**: Mock data (e.g., "Total Reach: 12,345") is used for design, but the final version will fetch live data via APIs.

### Customization
- **Fixed Layout**: For V0, the dashboard is static, but future versions could allow users to reorder cards or select preferred metrics.

### User Flow
- **First Login**: Users see the getting started guide, connect platforms, and land on the dashboard with populated data.
- **Daily Use**: Check metrics, review platform statuses, and use action buttons for quick tasks or navigate to detailed pages via "Manage" buttons or the sidebar.

---

## Sample Scenarios

1. **New User**: Logs in, sees the "Welcome" modal, connects GMB and Facebook, and views the dashboard with two platform cards and aggregate metrics.
2. **Daily Check**: Opens the dashboard, sees "Total Reach: 15,000 (+10%)" and a new review notification, clicks "Respond to Review" to reply via modal.
3. **Marketing Task**: Clicks "Schedule Post," selects Instagram in the modal, writes a post, sets a date, and schedules it—all without leaving the dashboard.

---

## Implementation Plan

- [ ] Design wireframes for desktop dashboard layout
- [ ] Create high-fidelity mockups of all UI components
- [ ] Develop responsive variations for tablet and mobile
- [ ] Implement header and sidebar navigation components
- [ ] Build metric cards and charts for the Overview section
- [ ] Create platform connection cards with status indicators
- [ ] Develop action center with modals
- [ ] Implement onboarding flow for new users
- [ ] Test with target users and refine based on feedback
- [ ] Deploy MVP dashboard with core functionality
