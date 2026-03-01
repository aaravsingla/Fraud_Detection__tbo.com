import { Link } from "react-router";
import { AlertCircle, Home } from "lucide-react";
import { Button } from "../components/ui/button";

export function NotFound() {
  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center p-6">
      <div className="text-center">
        <AlertCircle className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h1 className="text-4xl font-bold text-[#003366] mb-2">404</h1>
        <h2 className="text-xl font-semibold mb-4">Page Not Found</h2>
        <p className="text-gray-600 mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Button asChild className="bg-[#003366] hover:bg-[#003366]/90">
          <Link to="/">
            <Home className="w-4 h-4 mr-2" />
            Return to Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
