/**
 * Chat Layout Component
 * Main container for the chat interface with responsive design
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import ConversationList from './ConversationList';
import MessageThread from './MessageThread';
import ChatHeader from './ChatHeader';
import ErrorBoundary from '../../shared/components/ErrorBoundary';
import { ComponentErrorFallback } from '../../shared/components/ErrorFallbacks';
import { useAdminWebSocket } from '../../contexts/WebSocketContext';

export default function ChatLayout() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const { isConnected } = useAdminWebSocket();

  // Check mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Get conversation ID from URL params
  useEffect(() => {
    const conversationId = searchParams.get('conversation');
    if (conversationId) {
      setSelectedConversationId(conversationId);
      // On mobile, hide sidebar when conversation is selected
      if (isMobile) {
        setShowSidebar(false);
      }
    }
  }, [searchParams, isMobile]);

  /**
   * Handle conversation selection
   */
  const handleConversationSelect = (conversationId) => {
    setSelectedConversationId(conversationId);
    setSearchParams({ conversation: conversationId });

    // On mobile, hide sidebar when conversation is selected
    if (isMobile) {
      setShowSidebar(false);
    }
  };

  /**
   * Handle back to conversation list (mobile)
   */
  const handleBackToList = () => {
    setSelectedConversationId(null);
    setSearchParams({});
    setShowSidebar(true);
  };

  /**
   * Toggle sidebar visibility
   */
  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  return (
    <div className="h-[calc(100vh-80px)] bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="flex h-full">
        {/* Sidebar - Conversation List */}
        <div
          className={clsx(
            'border-r border-gray-200 dark:border-gray-700 transition-all duration-300',
            showSidebar ? 'w-80 flex-shrink-0' : 'w-0',
            // On mobile, sidebar takes full width when shown
            isMobile && showSidebar && 'w-full absolute inset-0 z-10 bg-white dark:bg-gray-900'
          )}
        >
          {showSidebar && (
            <ErrorBoundary
              level="component"
              fallback={
                <ComponentErrorFallback
                  onRetry={() => window.location.reload()}
                  componentName="Conversation List"
                />
              }
            >
              <ConversationList
                selectedId={selectedConversationId}
                onSelect={handleConversationSelect}
                isMobile={isMobile}
              />
            </ErrorBoundary>
          )}
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedConversationId ? (
            <>
              {/* Chat Header */}
              <ErrorBoundary
                level="component"
                fallback={<ComponentErrorFallback componentName="Chat Header" />}
              >
                <ChatHeader
                  conversationId={selectedConversationId}
                  onBackClick={isMobile ? handleBackToList : null}
                  onToggleSidebar={!isMobile ? toggleSidebar : null}
                  showBackButton={isMobile}
                  showSidebarToggle={!isMobile}
                  isConnected={isConnected}
                />
              </ErrorBoundary>

              {/* Message Thread */}
              <div className="flex-1 min-h-0">
                <ErrorBoundary
                  level="component"
                  fallback={
                    <ComponentErrorFallback
                      componentName="Message Thread"
                      onRetry={() => handleConversationSelect(selectedConversationId)}
                    />
                  }
                >
                  <MessageThread
                    conversationId={selectedConversationId}
                    isConnected={isConnected}
                  />
                </ErrorBoundary>
              </div>
            </>
          ) : (
            /* No Conversation Selected */
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ChevronLeft className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Select a conversation
                </h3>
                <p className="text-gray-600 dark:text-gray-400 max-w-sm">
                  Choose a conversation from the sidebar to start messaging with candidates and clients.
                </p>

                {/* Mobile: Show conversation list button */}
                {isMobile && !showSidebar && (
                  <button
                    onClick={toggleSidebar}
                    className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <ChevronRight className="h-4 w-4 mr-2" />
                    View Conversations
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Toggle Button (Desktop) */}
        {!isMobile && (
          <button
            onClick={toggleSidebar}
            className={clsx(
              'absolute left-80 top-4 z-20 w-6 h-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-300',
              !showSidebar && 'left-4'
            )}
          >
            {showSidebar ? (
              <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            )}
          </button>
        )}

        {/* Connection Status Indicator */}
        {!isConnected && (
          <div className="absolute top-2 right-2 z-30">
            <div className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-medium">
              Disconnected
            </div>
          </div>
        )}
      </div>
    </div>
  );
}