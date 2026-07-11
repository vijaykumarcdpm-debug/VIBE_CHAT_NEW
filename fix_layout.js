const fs = require('fs');
let code = fs.readFileSync('src/components/ChatInterface.tsx', 'utf8');

// 1. Update showMainChatPane logic
code = code.replace(
  "const showMainChatPane = !!activePartner || (sidebarTab === 'lounge' && (chatState === 'idle' || chatState === 'searching'));",
  "const showMainChatPane = !!activePartner || (sidebarTab === 'lounge' && (chatState === 'idle' || chatState === 'searching' || chatState === 'matched'));"
);

// 2. Update Left Sidebar classes
code = code.replace(
  "      <div className={`${showLeftSidebar ? 'flex w-full md:w-[420px] lg:w-[500px]' : 'hidden md:flex md:w-[420px] lg:w-[500px]'} shrink-0 flex flex-col min-h-0 flex-1 transition-all duration-300 ${",
  "      <div className={`${showLeftSidebar ? (showMainChatPane ? 'flex w-full md:w-[420px] lg:w-[500px]' : 'flex w-full') : 'hidden md:flex md:w-[420px] lg:w-[500px]'} shrink-0 flex flex-col min-h-0 flex-1 transition-all duration-300 ${"
);

// 3. Update Main Chat Pane classes
code = code.replace(
  "        <div className={`${showMainChatPane ? 'flex w-full md:w-auto' : 'hidden md:flex md:w-auto'} flex-1 flex-col justify-between min-h-0 relative min-w-0`}>",
  "        <div className={`${showMainChatPane ? 'flex w-full md:w-auto' : 'hidden'} flex-1 flex-col justify-between min-h-0 relative min-w-0`}>"
);

fs.writeFileSync('src/components/ChatInterface.tsx', code);
