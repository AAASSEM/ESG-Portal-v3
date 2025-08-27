#!/bin/bash
# Script to run Django with ngrok for easy sharing and testing

echo "🚀 Starting ESG Portal with ngrok..."

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok is not installed. Please install ngrok first:"
    echo "   - Visit: https://ngrok.com/download"
    echo "   - Or: brew install ngrok (on macOS)"
    exit 1
fi

echo "📦 Building React frontend..."
cd frontend
npm run build
cd ..

echo "📂 Copying build files to Django..."
cd backend
mkdir -p staticfiles
cp -r ../frontend/build/* staticfiles/

echo "📊 Collecting static files..."
python3 manage.py collectstatic --no-input

echo "🗄️ Running migrations..."
python3 manage.py migrate

echo "🏁 Starting Django server..."
# Start Django server in background
python3 manage.py runserver 8000 &
DJANGO_PID=$!

# Wait for Django to start
sleep 3

echo "🌐 Starting ngrok tunnel..."
# Start ngrok in background and capture URL
ngrok http 8000 --log=stdout > ngrok.log &
NGROK_PID=$!

# Wait for ngrok to start
sleep 5

# Extract ngrok URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o 'https://[^"]*\.ngrok-free\.app')

if [ -n "$NGROK_URL" ]; then
    echo "✅ Your app is now live at:"
    echo "   🌍 Public URL: $NGROK_URL"
    echo "   🏠 Local URL:  http://localhost:8000"
    echo ""
    echo "📋 Share this URL with others to access your app!"
    echo "🛑 Press Ctrl+C to stop both servers"
    
    # Keep script running
    trap "echo '🛑 Stopping servers...'; kill $DJANGO_PID $NGROK_PID; exit" INT
    wait
else
    echo "❌ Failed to get ngrok URL. Check if ngrok is properly configured."
    kill $DJANGO_PID $NGROK_PID
    exit 1
fi