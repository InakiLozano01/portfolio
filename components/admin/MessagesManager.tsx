'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'
import { useToast } from '@/components/ui/use-toast'
import { MessageSquare } from 'lucide-react'

type FilterType = 'priority' | 'read' | 'all'

interface Message {
  _id: string;
  name: string;
  email: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export default function MessagesManager() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [filter, setFilter] = useState<FilterType>('priority');
  const [currentPage, setCurrentPage] = useState(1);
  const messagesPerPage = 10;

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const response = await fetch('/api/messages');
      if (!response.ok) throw new Error('Failed to fetch messages');
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load messages',
        variant: 'destructive',
      });
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/messages/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ read: true }),
      });

      if (!response.ok) throw new Error('Failed to update message');

      await fetchMessages();
      toast({
        title: 'Success',
        description: 'Message marked as read',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update message',
        variant: 'destructive',
      });
    }
  };

  const getFilteredMessages = () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    switch (filter) {
      case 'priority':
        return messages.filter(
          (msg) =>
            !msg.read ||
            new Date(msg.createdAt) >= oneWeekAgo
        );
      case 'read':
        return messages.filter((msg) => msg.read);
      case 'all':
      default:
        return messages;
    }
  };

  const filteredMessages = getFilteredMessages();
  const totalPages = Math.ceil(filteredMessages.length / messagesPerPage);
  const currentMessages = filteredMessages.slice(
    (currentPage - 1) * messagesPerPage,
    currentPage * messagesPerPage
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 p-6 bg-white rounded-lg shadow-md border-l-4 border-blue-600">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Messages</h2>
          <p className="text-slate-600 text-sm mt-1">Handle visitor inquiries and communications</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setFilter('priority')}
            variant={filter === 'priority' ? 'default' : 'outline'}
            className={filter === 'priority' ? 'bg-red-600 hover:bg-red-700 text-white' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}
          >
            Priority
          </Button>
          <Button
            onClick={() => setFilter('read')}
            variant={filter === 'read' ? 'default' : 'outline'}
            className={filter === 'read' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}
          >
            Read
          </Button>
          <Button
            onClick={() => setFilter('all')}
            variant={filter === 'all' ? 'default' : 'outline'}
            className={filter === 'all' ? 'bg-slate-600 hover:bg-slate-700 text-white' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}
          >
            All
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 space-y-3">
          {currentMessages.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-500 text-lg">No messages found</p>
              <p className="text-slate-400 text-sm">Messages from visitors will appear here</p>
            </div>
          ) : (
            currentMessages.map((message) => (
              <Card key={message._id} className="hover:shadow-md transition-all duration-200 border border-slate-200 hover:border-slate-300">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-slate-900 text-lg">{message.name}</h3>
                        <Badge
                          className={!message.read ?
                            "bg-red-100 text-red-800 border border-red-200 hover:bg-red-200" :
                            "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                          }
                        >
                          {message.read ? 'Read' : 'Unread'}
                        </Badge>
                        {new Date(message.createdAt) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) && (
                          <Badge className="bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200">
                            New
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 font-medium">{message.email}</p>
                      <p className="text-sm text-slate-700 leading-relaxed">{message.message}</p>
                      <p className="text-xs text-slate-500">
                        {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    {!message.read && (
                      <Button
                        variant="outline"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-300 ml-4"
                        onClick={() => handleMarkAsRead(message._id)}
                      >
                        Mark as Read
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <Button
              key={page}
              variant={currentPage === page ? 'default' : 'outline'}
              className={currentPage === page ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
} 