import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    console.log('Upload API: Starting file upload');
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || 'uploads';

    console.log('Upload API: File details:', {
      name: file?.name,
      size: file?.size,
      type: file?.type,
      folder
    });

    if (!file) {
      console.error('Upload API: No file provided');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('Upload API: Auth result:', { user: !!user, authError });
    
    if (authError || !user) {
      console.error('Upload API: Unauthorized', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log('Upload API: File converted to buffer, size:', buffer.length);

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    console.log('Upload API: Generated filename:', fileName);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('user-uploads')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    console.log('Upload API: Upload result:', { uploadData, uploadError });

    if (uploadError) {
      console.error('Upload API: Upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file', details: uploadError.message }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('user-uploads')
      .getPublicUrl(fileName);

    console.log('Upload API: Public URL generated:', publicUrl);

    return NextResponse.json({ 
      url: publicUrl,
      path: fileName,
      name: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
