from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Profile, Family, FamilyMember


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'password', 'email']

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        Profile.objects.create(user=user, relation_with_baby='other')
        return user


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = '__all__'


class FamilyMemberSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    relation_with_baby = serializers.CharField(source='user.profile.relation_with_baby', read_only=True)
    relation_label = serializers.CharField(source='user.profile.get_relation_with_baby_display', read_only=True)

    class Meta:
        model = FamilyMember
        fields = '__all__'


class FamilySerializer(serializers.ModelSerializer):
    members = FamilyMemberSerializer(many=True, read_only=True)

    class Meta:
        model = Family
        fields = '__all__'


class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'profile']
