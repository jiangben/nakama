package server

import (
	"context"
	"fmt"
	"github.com/gofrs/uuid/v5"
	"github.com/heroiclabs/nakama/v3/game"
	"go.uber.org/zap"
	"google.golang.org/protobuf/types/known/emptypb"
)

type InviteRecord struct {
	Invitee         string `json:"invitee"`
	RewardClaimed   bool   `json:"reward_claimed"`
	RewardAvailable bool   `json:"reward_available"`
}

type InviteData struct {
	List      map[string]*InviteRecord `json:"invite_list"`
	BeInvited bool                     `json:"be_invited"`
	Inviter   string                   `json:"inviter"`
}

func (f *InviteData) GetCollection() string {
	return "user_data"
}

func (f *InviteData) GetKey() string {
	return "invite"
}

func (f *InviteData) Init() {
	f.List = make(map[string]*InviteRecord)
	f.BeInvited = false
	f.Inviter = ""
}

func (s *ApiServer) SubmitBeInvited(ctx context.Context, in *game.SubmitBeInvitedRequest) (*emptypb.Empty, error) {
	userID := ctx.Value(ctxUserIDKey{}).(uuid.UUID)
	userName := ctx.Value(ctxUsernameKey{}).(string)

	inviteeData := &InviteData{}
	if err := LoadData(ctx, s.logger, s.db, userID, inviteeData); err != nil {
		return nil, err
	}

	if inviteeData.BeInvited {
		s.logger.Info("已接受邀请", zap.String("share_id", in.ShareId))
		return &emptypb.Empty{}, nil
	}

	users, err := GetUsers(ctx, s.logger, s.db, s.statusRegistry, nil, []string{in.ShareId}, nil)
	if err != nil {
		return nil, err
	}
	if users == nil || len(users.Users) == 0 {
		s.logger.Error("邀请人不存在", zap.String("share_id", in.ShareId))
		return nil, nil
	}

	inviter := users.Users[0]
	inviterID, _ := uuid.FromString(inviter.Id)

	inviterData := &InviteData{}
	if err := LoadData(ctx, s.logger, s.db, inviterID, inviterData); err != nil {
		return nil, err
	}

	inviterData.List[userName] = &InviteRecord{Invitee: userName, RewardAvailable: false, RewardClaimed: false}
	if err = SaveData(ctx, s.logger, s.db, s.metrics, s.storageIndex, inviterID, inviterData); err != nil {
		return nil, err
	}

	inviteeData.BeInvited = true
	inviteeData.Inviter = inviter.Username
	if err = SaveData(ctx, s.logger, s.db, s.metrics, s.storageIndex, userID, inviteeData); err != nil {
		return nil, err
	}

	return &emptypb.Empty{}, nil
}

type HomeData struct {
	CurLevelId string `json:"curLevelId"`
}

func (f *HomeData) GetCollection() string {
	return "Home"
}
func (f *HomeData) GetKey() string {
	return "HomeData"
}

func (f *HomeData) Init() {
	f.CurLevelId = ""
}

func (s *ApiServer) ListInvitee(ctx context.Context, in *emptypb.Empty) (*game.ListInviteeResponse, error) {
	userID := ctx.Value(ctxUserIDKey{}).(uuid.UUID)
	inviterData := &InviteData{}
	if err := LoadData(ctx, s.logger, s.db, userID, inviterData); err != nil {
		return nil, err
	}

	resp := &game.ListInviteeResponse{InviterIds: []string{}}
	for _, v := range inviterData.List {
		if !v.RewardClaimed {
			if users, err := GetUsers(ctx, s.logger, s.db, s.statusRegistry, nil, []string{v.Invitee}, nil); err != nil {
				return nil, err
			} else {
				inviter := users.Users[0]
				inviterID, _ := uuid.FromString(inviter.Id)
				homeData := &HomeData{}
				if err := LoadData(ctx, s.logger, s.db, inviterID, homeData); err != nil {
					return nil, err
				}
				if homeData.CurLevelId > "L1001" {
					resp.InviterIds = append(resp.InviterIds, v.Invitee)
				}
			}
		}
	}
	return resp, nil
}

func (s *ApiServer) ClaimInviteReward(ctx context.Context, in *game.ClaimInviteRewardRequest) (*emptypb.Empty, error) {
	userID := ctx.Value(ctxUserIDKey{}).(uuid.UUID)
	inviterData := &InviteData{}
	if err := LoadData(ctx, s.logger, s.db, userID, inviterData); err != nil {
		return nil, err
	}

	for _, v := range in.InviterIds {
		entry, exists := inviterData.List[v]
		if !exists {
			return nil, fmt.Errorf("inviter ID %s does not exist in the list", v)
		}
		if !entry.RewardClaimed {
			inviterData.List[v].RewardClaimed = true
		}
	}

	if err := SaveData(ctx, s.logger, s.db, s.metrics, s.storageIndex, userID, inviterData); err != nil {
		return nil, err
	}

	return &emptypb.Empty{}, nil
}
