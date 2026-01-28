import { useState } from 'react';
import { Layout } from './components/Layout';
import type { TabType } from './components/Layout';
import { SchedulePage } from './components/SchedulePage';
import { ClientsPage } from './components/ClientsPage';
import { FinancePage } from './components/FinancePage';
import { MessagesPage } from './components/MessagesPage';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('schedule');

  const renderPage = () => {
    switch (activeTab) {
      case 'schedule':
        return <SchedulePage />;
      case 'clients':
        return <ClientsPage />;
      case 'finance':
        return <FinancePage />;
      case 'messages':
        return <MessagesPage />;
      default:
        return <SchedulePage />;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderPage()}
    </Layout>
  );
}

export default App;
