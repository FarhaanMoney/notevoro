import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    console.log('Debug auth route hit');
    
    const authHeader = req.headers.get('authorization');
    const cookieHeader = req.headers.get('cookie');
    
    const authHeaderExists = !!authHeader;
    const tokenExists = authHeader && authHeader.startsWith('Bearer ');
    const token = tokenExists ? authHeader.replace('Bearer ', '') : null;
    const tokenLength = token ? token.length : 0;
    const tokenPreview = token ? `${token.substring(0, 20)}...` : null;
    
    console.log('Debug auth - Authorization header exists:', authHeaderExists);
    console.log('Debug auth - Token exists:', tokenExists);
    console.log('Debug auth - Token length:', tokenLength);
    console.log('Debug auth - Token preview:', tokenPreview);
    console.log('Debug auth - Cookie header:', cookieHeader);
    
    return NextResponse.json({
      authHeaderExists,
      tokenExists,
      tokenLength,
      tokenPreview,
      cookieHeader: cookieHeader ? 'exists' : 'none',
      cookieLength: cookieHeader ? cookieHeader.length : 0,
    });
  } catch (error) {
    console.error('Debug auth route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
