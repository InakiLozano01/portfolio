'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'
import { useToast } from '@/components/ui/use-toast'
import { MessageSquare, CheckCircle, Clock, Inbox, Mail, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

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
  const [search, setSearch] = useState('');
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
    let filtered = messages;
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    if (search) {
      const query = search.toLowerCase();
      filtered = filtered.filter(
        (msg) =>
          msg.name.toLowerCase().includes(query) ||
          msg.email.toLowerCase().includes(query) ||
          msg.message.toLowerCase().includes(query)
      );
    }

    switch (filter) {
      case 'priority':
        return filtered.filter(
          (msg) =>
            !msg.read ||
            new Date(msg.createdAt) >= oneWeekAgo
        );
      case 'read':
        return filtered.filter((msg) => msg.read);
      case 'all':
      default:
        return filtered;
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
      <div className="flex flex-col space-y-4 p-6 bg-white rounded-lg shadow-sm border-l-4 border-[#FD4345]">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Messages</h2>
            <p className="text-slate-500 text-sm mt-1">Handle visitor inquiries and communications</p>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
            <Button
              onClick={() => setFilter('priority')}
              variant="ghost"
              size="sm"
              className={`rounded-md transition-all ${filter === 'priority' ? 'bg-white text-[#FD4345] shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Priority
            </Button>
            <Button
              onClick={() => setFilter('read')}
              variant="ghost"
              size="sm"
              className={`rounded-md transition-all ${filter === 'read' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Read
            </Button>
            <Button
              onClick={() => setFilter('all')}
              variant="ghost"
              size="sm"
              className={`rounded-md transition-all ${filter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
            >
              All
            </Button>
          </div>
        </div>
        
        <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
                placeholder="Search messages..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white focus-visible:ring-[#FD4345]"
            />
        </div>
      </div>

      <div className="space-y-4">
          {currentMessages.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-lg border border-dashed border-slate-200 shadow-sm">
              <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Inbox className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900">No messages found</h3>
              <p className="text-slate-500 text-sm mt-1">
                  {filter === 'priority' ? 'You have no unread or recent messages.' : 
                   filter === 'read' ? 'No read messages found.' : 
                   'Messages from visitors will appear here.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
                {currentMessages.map((message) => (
                <Card key={message._id} className={`group transition-all duration-200 border hover:border-[#FD4345]/30 bg-white ${!message.read ? 'shadow-md border-l-4 border-l-[#FD4345]' : 'shadow-sm border-slate-200 opacity-90 hover:opacity-100'}`}>
                    <CardContent className="p-5">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                        <div className="space-y-2 flex-1 w-full">
                        <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                                {message.name}
                                <span className="text-xs font-normal text-slate-400 flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                                    <Mail className="w-3 h-3" /> {message.email}
                                </span>
                            </h3>
                            <div className="flex items-center gap-2">
                                {!message.read ? (
                                    <Badge className="bg-[#FD4345] hover:bg-[#ff5456] border-none text-white shadow-sm">
                                        New Message
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="text-slate-500 border-slate-200 bg-slate-50">
                                        Read
                                    </Badge>
                                )}
                                {new Date(message.createdAt) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) && message.read && (
                                <Badge className="bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100">
                                    Recent
                                </Badge>
                                )}
                            </div>
                        </div>
                        
                        <div className="bg-slate-50 p-3 rounded-md border border-slate-100 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                            {message.message}
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                        </div>
                        </div>
                        
                        {!message.read && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-slate-500 hover:text-[#FD4345] hover:bg-[#FD4345]/10 shrink-0 whitespace-nowrap"
                            onClick={() => handleMarkAsRead(message._id)}
                        >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Mark as Read
                        </Button>
                        )}
                    </div>
                    </CardContent>
                </Card>
                ))}
            </div>
          )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <Button
              key={page}
              variant={currentPage === page ? 'default' : 'outline'}
              size="sm"
              className={currentPage === page ? 'bg-[#FD4345] hover:bg-[#ff5456] text-white shadow-sm' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}
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
