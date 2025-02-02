'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'
import { useToast } from '@/components/ui/use-toast'

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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Messages</h2>
        <div className="flex gap-2">
          <Button
            onClick={() => setFilter('priority')}
            variant={filter === 'priority' ? 'default' : 'outline'}
            className={filter === 'priority' ? 'bg-green-500 hover:bg-green-600 text-white' : ''}
          >
            Priority
          </Button>
          <Button
            onClick={() => setFilter('read')}
            variant={filter === 'read' ? 'default' : 'outline'}
            className={filter === 'read' ? 'bg-green-500 hover:bg-green-600 text-white' : ''}
          >
            Read
          </Button>
          <Button
            onClick={() => setFilter('all')}
            variant={filter === 'all' ? 'default' : 'outline'}
            className={filter === 'all' ? 'bg-green-500 hover:bg-green-600 text-white' : ''}
          >
            All
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {currentMessages.map((message) => (
          <Card key={message._id} className="hover:bg-gray-50 transition-colors">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{message.name}</h3>
                    <Badge
                      className={!message.read ?
                        "bg-green-500 hover:bg-green-600 text-white" :
                        "bg-gray-500 hover:bg-gray-600 text-white"
                      }
                    >
                      {message.read ? 'Read' : 'Unread'}
                    </Badge>
                    {new Date(message.createdAt) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) && (
                      <Badge className="bg-green-500 hover:bg-green-600 text-white">
                        New
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{message.email}</p>
                  <p className="text-sm">{message.message}</p>
                </div>
                {!message.read && (
                  <Button
                    variant="outline"
                    className="text-green-500 hover:text-green-700 hover:bg-green-50"
                    onClick={() => handleMarkAsRead(message._id)}
                  >
                    Mark as Read
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <Button
              key={page}
              variant={currentPage === page ? 'default' : 'outline'}
              className={currentPage === page ? 'bg-green-500 hover:bg-green-600 text-white' : ''}
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