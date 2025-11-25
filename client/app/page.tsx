import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import FileUploadComponent from './components/file-upload';
import ChatComponent from './components/chat';

export default function Home() {
  return (
    <>
      <SignedOut>
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white p-4">
          <div className="text-center space-y-6 max-w-md">
            <h1 className="text-4xl font-bold bg-linear-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
              PDF RAG Agent
            </h1>
            <p className="text-gray-400 text-lg">
              Upload PDFs and chat with your documents using AI
            </p>
            <div className="pt-4">
              <SignInButton mode="modal">
                <button className="bg-[#6c47ff] hover:bg-[#5639cc] text-white rounded-lg font-medium text-base h-12 px-8 cursor-pointer transition-colors">
                  Sign In to Continue
                </button>
              </SignInButton>
            </div>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="flex h-screen overflow-hidden bg-gray-950 text-white">
          {/* Sidebar */}
          <div className="w-full md:w-[25vw] min-w-[300px] h-screen p-6 border-r border-gray-800 flex flex-col justify-between overflow-y-auto">
            <div className="mt-10">
              <FileUploadComponent />
            </div>
            <div className="p-4 flex justify-center">
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col bg-linear-to-b from-gray-900 to-gray-950">
            <ChatComponent />
          </div>
        </div>
      </SignedIn>
    </>
  );
}
