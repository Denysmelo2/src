import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '@/lib/supabase'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export default function SupabaseAuth({ view = 'sign_up' }) {
  const navigate = useNavigate()
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      navigate('/dashboard')
    }
  }, [user, navigate])

  return (
    <div className="max-w-md mx-auto">
      <Auth
        supabaseClient={supabase}
        view={view}
        appearance={{ 
          theme: ThemeSupa,
          variables: {
            default: {
              colors: {
                brand: '#7D4DFB',
                brandAccent: '#FF3FCE',
              }
            }
          }
        }}
        theme="light"
        providers={['google']}
        redirectTo={`${window.location.origin}/dashboard`}
        showLinks={true}
        localization={{
          variables: {
            sign_up: {
              email_label: 'Email',
              password_label: 'Password',
              button_label: 'Start 7-Day Free Trial',
              loading_button_label: 'Creating account...',
              social_provider_text: 'Continue with {{provider}}',
              link_text: 'Already have an account? Sign in',
            },
          },
        }}
      />
    </div>
  )
}