import { Search, MoreVertical, Phone, Paperclip, Send, CheckCircle2 } from 'lucide-react';

export default function AdminInbox() {
  const conversations = [
    { id: 1, name: 'John Doe', preview: 'Is the gym open on weekends?', time: '10:42 AM', unread: 2, online: true },
    { id: 2, name: 'Sarah Williams', preview: 'Thanks for the quick fix!', time: 'Yesterday', unread: 0, online: false },
    { id: 3, name: 'Michael Chang', preview: 'When is the rent due?', time: 'Tuesday', unread: 0, online: true },
  ];

  return (
    <div className="h-[calc(100vh-8rem)] bg-white dark:bg-gray-900 shadow-sm rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col md:flex-row">
      {/* Sidebar - Chat List */}
      <div className="w-full md:w-80 h-1/3 md:h-auto border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-800 flex flex-col bg-gray-50 dark:bg-gray-950">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">WhatsApp Inbox</h2>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search chats..." className="pl-9 pr-4 py-2 w-full border border-gray-300 dark:border-gray-700 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map((chat) => (
            <div key={chat.id} className="p-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-800 cursor-pointer flex gap-3 relative">
              <div className="relative">
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                  {chat.name.charAt(0)}
                </div>
                {chat.online && <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-white rounded-full"></div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{chat.name}</h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{chat.time}</span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{chat.preview}</p>
              </div>
              {chat.unread > 0 && (
                <div className="h-5 w-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 self-center">
                  {chat.unread}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-[#EFEAE2]">
        {/* Chat Header */}
        <div className="h-16 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">J</div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-gray-100">John Doe</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                Room 201-A • <span className="text-green-500">Online</span>
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <button className="text-gray-400 hover:text-gray-600 dark:text-gray-400"><Phone className="h-5 w-5" /></button>
            <button className="text-gray-400 hover:text-gray-600 dark:text-gray-400"><MoreVertical className="h-5 w-5" /></button>
          </div>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex justify-center">
            <span className="bg-white dark:bg-gray-900/80 px-3 py-1 rounded-md text-xs text-gray-500 dark:text-gray-400 shadow-sm backdrop-blur-sm">Today</span>
          </div>

          <div className="flex flex-col gap-1 max-w-[75%]">
            <div className="bg-white dark:bg-gray-900 p-3 rounded-lg rounded-tl-none shadow-sm text-gray-800 dark:text-gray-200 text-sm">
              Hi, I have a quick question.
            </div>
            <div className="bg-white dark:bg-gray-900 p-3 rounded-lg rounded-tl-none shadow-sm text-gray-800 dark:text-gray-200 text-sm">
              Is the gym open on weekends?
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">10:42 AM</span>
          </div>

          <div className="flex flex-col gap-1 max-w-[75%] self-end">
            <div className="bg-[#D9FDD3] p-3 rounded-lg rounded-tr-none shadow-sm text-gray-900 dark:text-gray-100 text-sm relative">
              Hello John! Yes, the gym is open 24/7 for all residents. Your digital key will grant you access.
              <CheckCircle2 className="h-3 w-3 text-blue-500 absolute bottom-1.5 right-1.5" />
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 mr-1 self-end">10:45 AM</span>
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-950 rounded-full px-4 border border-gray-200 dark:border-gray-800">
            <button className="text-gray-400 hover:text-gray-600 dark:text-gray-400 py-3"><Paperclip className="h-5 w-5" /></button>
            <input type="text" placeholder="Type a message..." className="flex-1 bg-transparent py-3 outline-none text-sm" />
            <button className="text-blue-600 hover:text-blue-700 py-3"><Send className="h-5 w-5" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
