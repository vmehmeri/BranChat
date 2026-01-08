import { ChatView } from '@/components/chat/ChatView';
import { AppLayout } from '@/components/layout/AppLayout';

const Index = () => {
  return (
    <AppLayout>
      <div className="h-full">
        <ChatView />
      </div>
    </AppLayout>
  );
};

export default Index;
