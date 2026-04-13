
CREATE POLICY "Users can delete own read notifications"
ON public.admin_notifications
FOR DELETE
TO authenticated
USING (auth.uid() = user_id AND read = true);
